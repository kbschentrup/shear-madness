import { useEffect, useState } from "react";
import { getTournament } from "../backend/api";

export default function Tournament() {
  const [id, setId] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    const segments = path.split('/');
    setId(segments[segments.length - 2]);

    try {
      getTournament(segments[segments.length - 2]).then(tournament => {
        setName(tournament.name);
      });
    } catch (error) {
      console.error("Failed to fetch tournament:", error);
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        Signup For {name}
      </h1>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-700 dark:text-gray-200">
          Fill out the form below to join the tournament.
        </p>
      </div>
    </div>
  );
}
