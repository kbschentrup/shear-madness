import pb from './pocketbaseClient';

// Function to add a tournament
export async function addTournament(name: string) {
  try {
    const tournament = await pb.collection('tournaments').create({ name });
    return tournament;
  } catch (error) {
    console.error('Error adding tournament:', error);
    throw error;
  }
}

// Function to add a player to a tournament
export async function addPlayer(tournamentId: string, playerName: string) {
  try {
    const player = await pb.collection('players').create({
      tournamentId,
      name: playerName,
    });
    return player;
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
}

// Function to get the list of players in real time
export function getPlayersRealTime(tournamentId: string, callback: (players: any[]) => void) {
  try {
    return pb.collection('players').subscribe('*', (e) => {
      if (e.action === 'create' || e.action === 'update' || e.action === 'delete') {
        pb.collection('players')
          .getFullList({ filter: `tournamentId = "${tournamentId}"` })
          .then(callback)
          .catch((error) => console.error('Error fetching players:', error));
      }
    });
  } catch (error) {
    console.error('Error subscribing to players:', error);
    throw error;
  }
}

export async function getTournament(tournamentId: string) {
  try {
    const tournament = await pb.collection('tournaments').getOne(tournamentId);
    return tournament;
  } catch (error) {
    console.error('Error fetching tournament:', error);
    throw error;
  }
}