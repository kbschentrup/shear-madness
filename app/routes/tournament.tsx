import { useEffect, useState } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import { getTournament, getPlayersRealTime, getPlayers } from "../backend/api";

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
      });
    }

    getPlayers(id).then((playersList) => {
      setPlayers(playersList);
    });

    getPlayersRealTime(id, (playersList) => {
      setPlayers(playersList);
    });
  }, [id]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {decodeURIComponent(name)}
      </h1>
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
      <div className="mt-8 flex justify-center">
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
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Registered Players</h2>
        {players.length === 0 ? (
          <p className="text-gray-700 dark:text-gray-200">No players have registered yet.</p>
        ) : (
          <ul className="list-disc list-inside space-y-2">
            {players.map((player) => (
              <li key={player.id} className="text-gray-900 dark:text-gray-100">
                {player.playerName}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
