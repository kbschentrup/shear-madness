import { useParams } from "react-router";

export default function Tournament() {
  const { name } = useParams<{ name: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
        {decodeURIComponent(name || '')}
      </h1>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-700 dark:text-gray-200">
          Welcome to your tournament! You can start setting up your tournament details here.
        </p>
      </div>
    </div>
  );
}
