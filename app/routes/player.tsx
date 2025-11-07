import { useEffect, useState } from "react";
import { getPlayer, getTournament, getMatches, getTournamentRealTime, getMatchesRealTime } from "../backend/api";

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
  winningTeam: 1 | 2 | null | 0;
  round: number;
}

export default function Player() {
  const [id, setId] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [tournamentStatus, setTournamentStatus] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const segments = path.split('/');
    setId(segments[segments.length - 2]);

    try {
      getPlayer(segments[segments.length - 2]).then(player => {
        setTournamentName(player.expand?.tournamentId.name);
        setPlayerName(player.playerName);
        setTournamentId(player.tournamentId);

        // Load tournament status and matches
        loadTournamentData(player.tournamentId);
      });
    } catch (error) {
      console.error("Failed to fetch tournament:", error);
    }
  }, []);

  const loadTournamentData = async (tournamentId: string) => {
    try {
      setIsLoading(true);
      const tournament = await getTournament(tournamentId);
      setTournamentStatus(tournament.status);

      if (tournament.status === 'playing') {
        const existingMatches = await getMatches(tournamentId);

        if (existingMatches.length > 0) {
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
        }
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up real-time subscriptions for tournament and matches
  useEffect(() => {
    if (!tournamentId) return;

    let tournamentUnsubscribe: (() => void) | undefined;
    let matchesUnsubscribe: (() => void) | undefined;

    // Subscribe to tournament updates
    getTournamentRealTime(tournamentId, (tournament) => {
      console.log('Tournament updated:', tournament);
      setTournamentStatus(tournament.status);

      // If tournament just started, load matches
      if (tournament.status === 'playing' && matches.length === 0) {
        loadTournamentData(tournamentId);
      }
    }).then((unsubscribe) => {
      tournamentUnsubscribe = unsubscribe;
    });

    // Subscribe to matches updates only if tournament is playing
    if (tournamentStatus === 'playing') {
      getMatchesRealTime(tournamentId, (matchesData) => {
        console.log('Matches updated:', matchesData);
        const loadedMatches: Match[] = matchesData.map((m) => ({
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
      }).then((unsubscribe) => {
        matchesUnsubscribe = unsubscribe;
      });
    }

    // Cleanup subscriptions on unmount
    return () => {
      if (tournamentUnsubscribe) {
        tournamentUnsubscribe();
      }
      if (matchesUnsubscribe) {
        matchesUnsubscribe();
      }
    };
  }, [tournamentId, tournamentStatus]);

  const getRoundMatches = (round: number) => {
    return matches.filter(m => m.round === round);
  };

  const maxRounds = Math.max(...matches.map(m => m.round), 1);

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
        {tournamentName}
      </h1>

      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 mb-8">
        <p className="text-gray-700 dark:text-gray-200 text-center">
          Welcome, <span className="font-bold">{playerName}</span>!
          {tournamentStatus === 'signup' && ' You are registered for the tournament. Good luck!'}
          {tournamentStatus === 'playing' && ' The tournament is in progress!'}
        </p>
      </div>

      {tournamentStatus === 'playing' && matches.length > 0 && (
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

          {/* View-Only Tournament Bracket */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
              Tournament Bracket
            </h2>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-xl text-gray-600 dark:text-gray-400">Loading bracket...</div>
              </div>
            ) : (
              <div className="flex justify-center gap-8 overflow-x-auto pb-8">
                {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
                  const roundMatches = getRoundMatches(round);
                  return (
                    <div key={round} className="flex flex-col justify-around min-w-[300px]">
                      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                        {round === maxRounds && roundMatches.length === 1
                          ? 'Finals'
                          : round === maxRounds - 1 && roundMatches.length === 2
                            ? 'Semi-Finals'
                            : `Round ${round}`}
                      </h3>
                      <div className="flex flex-col justify-around gap-4 flex-1">
                        {roundMatches.map((match, idx) => (
                          <div
                            key={match.id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-lg p-4 border-2 border-gray-300 dark:border-gray-600"
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
                                className={`p-3 mb-3 rounded-lg transition-all ${match.winningTeam === 1
                                  ? 'bg-green-500 text-white font-bold shadow-lg scale-105'
                                  : 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700'
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
                                className={`p-3 rounded-lg transition-all ${match.winningTeam === 2
                                  ? 'bg-green-500 text-white font-bold shadow-lg scale-105'
                                  : 'bg-red-100 dark:bg-red-900 border-2 border-red-300 dark:border-red-700'
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
