import { useEffect, useState } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import { getTournament, getPlayersRealTime, getPlayers, startTournament } from "../backend/api";

export default function Tournament() {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [url, setUrl] = useState('');
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setId(queryParams.get('id') || '');
  }, []);

  useEffect(() => {
    if (id) {
      setUrl(`${window.location.origin}/tournament/${id}/signup`);
      getTournament(id).then((tournament) => {
        setName(tournament.name);

        if (tournament.status === 'playing') {
          window.location.href = `/tournament/${id}/bracket`;
        }
      });
    }

    getPlayers(id).then((playersList) => {
      setPlayers(playersList);
    });

    getPlayersRealTime(id, (playersList) => {
      setPlayers(playersList);
    });
  }, [id]);

  const handleStartTournament = () => {
    startTournament(id).then(() => {
      window.location.href = `/tournament/${id}/bracket`;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-lg">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {name}
      </h1>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex flex-col gap-6 flex-1">
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
            <p className="text-gray-700 dark:text-gray-200">
              Let's get ready to rumble! Scan the QR code or go directly to the URL below to join the tournament.
            </p>
            {id && (
              <p className="mt-4 text-center text-blue-600 dark:text-blue-400 break-all">
                <a href={url}>{url}</a>
              </p>
            )}
          </div>
          <div>
            <button
              onClick={handleStartTournament}
              disabled={players.length < 2 || players.length % 2 === 1}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
            >
              Start Tournament
            </button>
            {players.length < 2 && (
              <p className="mt-2 text-sm text-red-500 dark:text-gray-400">
                At least 2 players are required to start the tournament
              </p>
            )}
            {players.length % 2 === 1 && (
              <p className="mt-2 text-sm text-red-500 dark:text-gray-400">
                An even number of players is required to start the tournament
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-center bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
          {id && (
            <QRCodeCanvas
              value={url}
              size={256}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"H"}
              includeMargin={true}
            />
          )}
        </div>
      </div>
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Registered Players</h2>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
          <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Total Players: <span className="text-lg text-gray-900 dark:text-white">{players.length}</span>
            </p>
          </div>

          {players.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No players have registered yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                {players.map((player) => (
                  <li key={player.id} className="py-3 px-2 text-gray-900 dark:text-gray-100">
                    {player.playerName}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
