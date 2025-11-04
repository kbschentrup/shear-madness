import { useEffect, useState } from "react";
import { getTournament, getPlayers, updateMatch, getMatches, createMatch } from "../backend/api";

interface Team {
    player1: {
        playerName: string;
        id: string;
    };
    player2: {
        playerName: string;
        id: string;
    };
}

interface Match {
    id: string;
    team1: Team | null;
    team2: Team | null;
    winningTeam: 1 | 2 | null;
    round: number;
}

export default function TournamentBracket() {
    const [name, setName] = useState('');
    const [id, setId] = useState('');
    const [players, setPlayers] = useState<any[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const path = window.location.pathname;
        const segments = path.split('/');
        setId(segments[segments.length - 2]);
    }, []);

    useEffect(() => {
        if (id) {
            loadTournamentData();
        }
    }, [id]);

    const loadTournamentData = async () => {
        try {
            setIsLoading(true);
            const tournament = await getTournament(id);
            setName(tournament.name);

            const playersList = await getPlayers(id);
            setPlayers(playersList);

            // Try to load existing matches from PocketBase
            const existingMatches = await getMatches(id);

            if (existingMatches.length > 0) {
                // Convert PocketBase matches to our Match format
                const loadedMatches: Match[] = existingMatches.map((m) => ({
                    id: m.matchId,
                    team1: m.team1Player1 && m.team1Player2
                        ? { player1: m.team1Player1, player2: m.team1Player2 }
                        : null,
                    team2: m.team2Player1 && m.team2Player2
                        ? { player1: m.team2Player1, player2: m.team2Player2 }
                        : null,
                    winningTeam: m.winningTeam,
                    round: m.round
                }));
                setMatches(loadedMatches);
            } else {
                // No existing matches, initialize new bracket
                initializeBracket(playersList);
            }
        } catch (error) {
            console.error('Error loading tournament data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const initializeBracket = async (playersList: any[]) => {
        // Shuffle players for random team assignments
        const shuffledPlayers = [...playersList].sort(() => Math.random() - 0.5);

        // Create teams of 2 players
        const teams: Team[] = [];
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
            if (shuffledPlayers[i] && shuffledPlayers[i + 1]) {
                teams.push({
                    player1: { playerName: shuffledPlayers[i].playerName, id: shuffledPlayers[i].id },
                    player2: { playerName: shuffledPlayers[i + 1].playerName, id: shuffledPlayers[i + 1].id }
                });
            }
        }

        // Create first round matches (each match has 2 teams)
        const firstRoundMatches: Match[] = [];
        for (let i = 0; i < teams.length; i += 2) {
            // Save to PocketBase
            const match = await createMatch({
                tournamentId: id,
                round: 1,
                team1Player1: teams[i]?.player1.id || null,
                team1Player2: teams[i]?.player2.id || null,
                team2Player1: teams[i + 1]?.player1.id || null,
                team2Player2: teams[i + 1]?.player2.id || null,
            });

            firstRoundMatches.push({
                id: match.matchId,
                team1: teams[i] || null,
                team2: teams[i + 1] || null,
                winningTeam: match.winningTeam,
                round: match.round
            });
        }

        setMatches(firstRoundMatches);
    };

    const selectWinner = async (matchId: string, teamNumber: 1 | 2) => {
        // Update the match with the winner
        const updatedMatches = matches.map(match =>
            match.id === matchId ? { ...match, winningTeam: teamNumber } : match
        );

        // Save the updated match to PocketBase
        const updatedMatch = updatedMatches.find(m => m.id === matchId);
        if (updatedMatch) {
            await updateMatch({
                matchId: updatedMatch.id,
                round: updatedMatch.round,
                team1Player1: updatedMatch.team1 ? updatedMatch.team1.player1.id : null,
                team1Player2: updatedMatch.team1 ? updatedMatch.team1.player2.id : null,
                team2Player1: updatedMatch.team2 ? updatedMatch.team2.player1.id : null,
                team2Player2: updatedMatch.team2 ? updatedMatch.team2.player2.id : null,
                winningTeam: updatedMatch.winningTeam
            });
        }

        // Find the current match to get the round
        const currentMatch = updatedMatches.find(m => m.id === matchId);
        if (!currentMatch) {
            setMatches(updatedMatches);
            return;
        }

        const currentRound = currentMatch.round;

        // Check if all matches in current round are complete
        const currentRoundMatches = updatedMatches.filter(m => m.round === currentRound);
        const allComplete = currentRoundMatches.every(m => m.winningTeam !== null);

        // Only create next round if all matches are complete AND there's more than 1 match
        // This ensures we always have 2 teams for the next match
        if (allComplete && currentRoundMatches.length > 1) {
            // Collect all winning teams
            const winningTeams: Team[] = currentRoundMatches.map(match => {
                if (match.winningTeam === 1 && match.team1) return match.team1;
                if (match.winningTeam === 2 && match.team2) return match.team2;
                return null as any;
            }).filter(team => team !== null);

            // Create next round matches - only pairs of 2 teams
            const nextRoundMatches: Match[] = [];
            for (let i = 0; i < winningTeams.length; i += 2) {
                // Only create match if we have both teams
                if (winningTeams[i] && winningTeams[i + 1]) {
                    // Save new match to PocketBase
                    const match = await createMatch({
                        tournamentId: id,
                        round: currentRound + 1,
                        team1Player1: winningTeams[i].player1.id,
                        team1Player2: winningTeams[i].player2.id,
                        team2Player1: winningTeams[i + 1].player1.id,
                        team2Player2: winningTeams[i + 1].player2.id,
                    });

                    nextRoundMatches.push({
                        id: match.matchId,
                        team1: winningTeams[i],
                        team2: winningTeams[i + 1],
                        winningTeam: match.winningTeam,
                        round: match.round
                    });
                }
            }

            // Add new matches to state
            setMatches([...updatedMatches, ...nextRoundMatches]);
        } else {
            setMatches(updatedMatches);
        }
    };

    const getRoundMatches = (round: number) => {
        return matches.filter(m => m.round === round);
    };

    const maxRounds = Math.max(...matches.map(m => m.round), 1);

    // Only show champion if:
    // 1. There's a match in the max round with a winner
    // 2. AND there's only 1 match in that round (the finals)
    const finalRoundMatches = matches.filter(m => m.round === maxRounds);
    const isTrueFinals = finalRoundMatches.length === 1;
    const championMatch = isTrueFinals
        ? matches.find(m => m.round === maxRounds && m.winningTeam !== null)
        : null;
    const championTeam = championMatch?.winningTeam
        ? (championMatch.winningTeam === 1 ? championMatch.team1 : championMatch.team2)
        : null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">
                {name} - Tournament Bracket
            </h1>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="text-xl text-gray-600 dark:text-gray-400">Loading bracket...</div>
                </div>
            ) : (
                <>
                    {championTeam && (
                        <div className="mb-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg p-6 text-center">
                            <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                                🏆 Champions 🏆
                            </h2>
                            <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                                {championTeam.player1.playerName} & {championTeam.player2.playerName}
                            </p>
                        </div>
                    )}

                    {/* Single Elimination Bracket Layout */}
                    <div className="flex justify-center gap-8 overflow-x-auto pb-8">
                        {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
                            const roundMatches = getRoundMatches(round);
                            return (
                                <div key={round} className="flex flex-col justify-around min-w-[300px]">
                                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10">
                                        {round === maxRounds && roundMatches.length === 1
                                            ? 'Finals'
                                            : round === maxRounds - 1 && roundMatches.length === 2
                                                ? 'Semi-Finals'
                                                : `Round ${round}`}
                                    </h2>
                                    <div className="flex flex-col justify-around gap-4 flex-1">
                                        {roundMatches.map((match, idx) => (
                                            <div
                                                key={match.id}
                                                className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-4 border-2 border-gray-300 dark:border-gray-600"
                                                style={{
                                                    marginTop: round > 1 ? `${idx * (100 / roundMatches.length)}%` : '0'
                                                }}
                                            >
                                                <div className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                                                    Match {idx + 1}
                                                </div>

                                                {/* Team 1 */}
                                                {match.team1 && (
                                                    <div
                                                        onClick={() => !match.winningTeam && selectWinner(match.id, 1)}
                                                        className={`p-3 mb-3 rounded-lg transition-all ${match.winningTeam === 1
                                                            ? 'bg-green-500 text-white font-bold shadow-lg scale-105'
                                                            : match.team2
                                                                ? 'cursor-pointer bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 border-2 border-blue-300 dark:border-blue-700'
                                                                : 'bg-gray-100 dark:bg-gray-600 cursor-pointer opacity-75'
                                                            }`}
                                                    >
                                                        <div className="font-semibold text-sm">Team 1</div>
                                                        <div className="text-sm">{match.team1.player1.playerName}</div>
                                                        <div className="text-sm">{match.team1.player2.playerName}</div>
                                                    </div>
                                                )}

                                                <div className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 mb-3">
                                                    VS
                                                </div>

                                                {/* Team 2 */}
                                                {match.team2 ? (
                                                    <div
                                                        onClick={() => !match.winningTeam && selectWinner(match.id, 2)}
                                                        className={`p-3 rounded-lg cursor-pointer transition-all ${match.winningTeam === 2
                                                            ? 'bg-green-500 text-white font-bold shadow-lg scale-105'
                                                            : 'bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 border-2 border-red-300 dark:border-red-700'
                                                            }`}
                                                    >
                                                        <div className="font-semibold text-sm">Team 2</div>
                                                        <div className="text-sm">{match.team2.player1.playerName}</div>
                                                        <div className="text-sm">{match.team2.player2.playerName}</div>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-600 text-center">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            Bye - Team 1 advances
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {players.length === 0 && (
                        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                No players registered yet. At least 4 players are needed to create teams and start the bracket.
                            </p>
                        </div>
                    )}

                    {players.length > 0 && players.length < 4 && (
                        <div className="bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg p-6 text-center">
                            <p className="text-yellow-800 dark:text-yellow-200">
                                Need at least 4 players to create teams. Currently have {players.length} player(s).
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
