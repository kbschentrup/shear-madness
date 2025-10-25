import { useEffect, useState } from "react";
import { getPlayer } from "../backend/api";

export default function Player() {
  const [id, setId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    const segments = path.split('/');
    setId(segments[segments.length - 2]);

    try {
      getPlayer(segments[segments.length - 2]).then(player => {
        setTournamentName(player.expand?.tournamentId.name);
        setPlayerName(player.playerName);
      });
    } catch (error) {
      console.error("Failed to fetch tournament:", error);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {tournamentName}
      </h1>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-700 dark:text-gray-200 mb-6">
          Welcome, {playerName}! You are registered for the tournament. Good luck!
        </p>
      </div>
    </div>
  );
}
