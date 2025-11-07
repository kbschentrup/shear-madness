import { useEffect, useState } from "react";
import { getTournament, getPlayers, updateMatch, getMatches, createMatch } from "../backend/api";
import Bracket from "../components/Bracket";
import type { Team, Match } from "../types/tournament";

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

        // Calculate the next power of 2 to determine bracket size
        const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(teams.length)));
        const numByes = nextPowerOf2 - teams.length;

        // Create first round matches
        const firstRoundMatches: Match[] = [];
        let teamIndex = 0;

        // First, create matches with byes (teams that advance automatically)
        for (let i = 0; i < numByes; i++) {
            const match = await createMatch({
                tournamentId: id,
                round: 1,
                team1Player1: teams[teamIndex].player1.id,
                team1Player2: teams[teamIndex].player2.id,
                team2Player1: null,
                team2Player2: null,
            });

            firstRoundMatches.push({
                id: match.matchId,
                team1: teams[teamIndex],
                team2: null,
                winningTeam: match.winningTeam,
                round: match.round
            });

            teamIndex++;
        }

        // Then create regular matches with the remaining teams
        const remainingTeams = teams.slice(teamIndex);
        for (let i = 0; i < remainingTeams.length; i += 2) {
            if (remainingTeams[i] && remainingTeams[i + 1]) {
                const match = await createMatch({
                    tournamentId: id,
                    round: 1,
                    team1Player1: remainingTeams[i].player1.id,
                    team1Player2: remainingTeams[i].player2.id,
                    team2Player1: remainingTeams[i + 1].player1.id,
                    team2Player2: remainingTeams[i + 1].player2.id,
                });

                firstRoundMatches.push({
                    id: match.matchId,
                    team1: remainingTeams[i],
                    team2: remainingTeams[i + 1],
                    winningTeam: match.winningTeam,
                    round: match.round
                });
            }
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
        const allComplete = currentRoundMatches.every(m => m.winningTeam !== null && m.winningTeam !== 0);

        // Only create next round if all matches are complete AND there's more than 1 match
        if (allComplete && currentRoundMatches.length > 1) {
            // Collect all winning teams (including those with byes)
            const winningTeams: Team[] = currentRoundMatches.map(match => {
                if (match.winningTeam === 1 && match.team1) return match.team1;
                if (match.winningTeam === 2 && match.team2) return match.team2;
                // Handle bye matches - team1 automatically advances
                if (!match.team2 && match.team1) return match.team1;
                return null as any;
            }).filter(team => team !== null);

            // Create next round matches - pairs of 2 teams only (no more byes after round 1)
            const nextRoundMatches: Match[] = [];
            for (let i = 0; i < winningTeams.length; i += 2) {
                if (winningTeams[i] && winningTeams[i + 1]) {
                    // Both teams exist - create a normal match
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

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white text-center">
                {name} - Tournament Bracket
            </h1>

            <Bracket
                matches={matches}
                isLoading={isLoading}
                isReadOnly={false}
                onSelectWinner={selectWinner}
                stickyHeaderBg="bg-gray-50 dark:bg-gray-900"
            />

            {players.length === 0 && !isLoading && (
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
        </div>
    );
}
