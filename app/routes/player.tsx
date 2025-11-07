import { useEffect, useState } from "react";
import { getPlayer, getTournament, getMatches, getTournamentRealTime, getMatchesRealTime } from "../backend/api";
import Bracket from "../components/Bracket";
import type { Match } from "../types/tournament";

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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
            Tournament Bracket
          </h2>

          <Bracket
            matches={matches}
            isLoading={isLoading}
            isReadOnly={true}
            stickyHeaderBg="bg-white dark:bg-gray-800"
          />
        </div>
      )}
    </div>
  );
}
