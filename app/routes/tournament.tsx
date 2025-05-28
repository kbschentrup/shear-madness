import { useEffect, useState } from "react";

export default function Tournament() {
  const [name, setName] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    setName(queryParams.get('name') || '');
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {decodeURIComponent(name)}
      </h1>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-700 dark:text-gray-200">
          Let's get ready to rumble! Scan the QR code below to join the tournament.
        </p>
      </div>
    </div>
  );
}
