import logo from "./Gemini_Generated_Image_o61wnho61wnho61w-removebg-preview.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addTournament } from "../backend/api"; 

export function Welcome() {
  const navigate = useNavigate();
  const [tournamentName, setTournamentName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tournamentName.trim()) {
      try {
        const tournament = await addTournament(tournamentName);
        navigate(`/tournament?name=${encodeURIComponent(tournament.name)}&id=${tournament.id}`);
      } catch (error) {
        console.error("Failed to save tournament:", error);
      }
    }
  };

  return (
    <main className="flex items-center justify-center pt-16 pb-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 min-h-screen">
      <div className="flex-1 flex flex-col items-center gap-4 min-h-0">
        <header className="flex flex-col items-center gap-4">
          <div className="w-[500px] max-w-[100vw]">
            <img
              src={logo}
              alt="Tournament Logo"
              className="w-full"
            />
          </div>
        </header>
        <div className="max-w-[300px] w-full space-y-6 px-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <label htmlFor="tournamentName" className="block text-xl font-bold text-gray-800 dark:text-gray-100 text-center">
                Tournament Name
              </label>
              <input
                type="text"
                id="tournamentName"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter tournament name"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:hover:bg-blue-800"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}