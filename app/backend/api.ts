import pb from './pocketbaseClient';

// Function to create a temporary user account
async function ensureUserAuthenticated() {
  // Check if user is already authenticated
  if (pb.authStore.isValid) {
    return pb.authStore.record;
  }

  try {
    // Check if we have stored credentials in localStorage
    const storedEmail = localStorage.getItem('shear_madness_temp_email');
    const storedPassword = localStorage.getItem('shear_madness_temp_password');

    if (storedEmail && storedPassword) {
      try {
        // Try to authenticate with stored credentials
        await pb.collection('users').authWithPassword(storedEmail, storedPassword);
        return pb.authStore.record;
      } catch (authError) {
        console.log('Stored credentials invalid, creating new account');
        // Clear invalid credentials
        localStorage.removeItem('shear_madness_temp_email');
        localStorage.removeItem('shear_madness_temp_password');
      }
    }

    // Generate a random temporary user
    const randomId = Math.random().toString(36).substring(2, 15);
    const tempEmail = `temp_${randomId}@temp.local`;
    const tempPassword = Math.random().toString(36).substring(2, 15);
    const tempUsername = `temp_user_${randomId}`;

    // Create the user account
    const user = await pb.collection('users').create({
      email: tempEmail,
      password: tempPassword,
      passwordConfirm: tempPassword,
      username: tempUsername,
      name: `Temp User ${randomId}`,
    });

    // Authenticate with the newly created account
    await pb.collection('users').authWithPassword(tempEmail, tempPassword);
    
    // Store credentials in localStorage for future sessions
    localStorage.setItem('shear_madness_temp_email', tempEmail);
    localStorage.setItem('shear_madness_temp_password', tempPassword);
    
    return user;
  } catch (error) {
    console.error('Error creating temporary user:', error);
    throw error;
  }
}

// Function to add a tournament
export async function addTournament(name: string) {
  try {
    // Ensure user is authenticated (create temp account if needed)
    const user = await ensureUserAuthenticated();

    if (!user) {
      throw new Error('User authentication failed');
    }
    
    const tournament = await pb.collection('tournaments').create({ 
      name,
      ownerId: user.id,
      status: 'signup',
    });
    return tournament;
  } catch (error) {
    console.error('Error adding tournament:', error);
    throw error;
  }
}

export async function startTournament(tournamentId: string) {
  try {
    const tournament = await pb.collection('tournaments').update(tournamentId, {
      status: 'playing',
    });
    return tournament;
  } catch (error) {
    console.error('Error starting tournament:', error);
    throw error;
  }
}

// Function to add a player to a tournament
export async function addPlayer(tournamentId: string, playerName: string) {
  try {
    const player = await pb.collection('players').create({
      tournamentId,
      playerName,
    });
    return player;
  } catch (error) {
    console.error('Error adding player:', error);
    throw error;
  }
}

// Function to get the list of players in real time
export async function getPlayersRealTime(tournamentId: string, callback: (players: any[]) => void) {
  try {
    // Ensure user is authenticated (create temp account if needed)
    await ensureUserAuthenticated();

    return pb.collection('players').subscribe(`*`, (e) => {
      console.log('Real-time event received for players:', e);
      if (e.action === 'create' || e.action === 'update' || e.action === 'delete') {
        getPlayers(tournamentId)
          .then(callback)
          .catch((error) => console.error('Error fetching players:', error));
      }
    });
  } catch (error) {
    console.error('Error subscribing to players:', error);
    throw error;
  }
}

export async function getPlayers(tournamentId: string) {
  try {
    await ensureUserAuthenticated();

    const players = await pb.collection('players').getFullList({
      filter: `tournamentId = "${tournamentId}"`
    });
    return players;
  } catch (error) {
    console.error('Error fetching players:', error);
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

export async function getPlayer(playerId: string) {
  try {
    const player = await pb.collection('players').getOne(playerId, {
      expand: 'tournamentId'
    });
    return player;
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
}

export async function removePlayer(playerId: string) {
  try {
    await pb.collection('players').delete(playerId);
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
}

export async function getTournamentsByOwner() {
  try {
    const user = await ensureUserAuthenticated();

    if (!user) {
      throw new Error('User authentication failed');
    }

    const tournaments = await pb.collection('tournaments').getFullList({
      filter: `ownerId = "${user.id}"`
    });
    return tournaments;
  } catch (error) {
    console.error('Error fetching tournaments by owner:', error);
    throw error;
  }
}

export async function createMatch(matchData: {
  tournamentId: string;
  round: number;
  team1Player1: string | null;
  team1Player2: string | null;
  team2Player1: string | null;
  team2Player2: string | null;
}) {
  try {
    await ensureUserAuthenticated();

    // Create new match
    const match = await pb.collection('matches').create({
      tournamentId: matchData.tournamentId,
      round: matchData.round,
      team1: [matchData.team1Player1, matchData.team1Player2],
      team2: [matchData.team2Player1, matchData.team2Player2],
      winningTeam: null,
    });

    return mapMatchData(match);
  } catch (error) {
    console.error('Error saving match:', error);
    throw error;
  }
}

export async function updateMatch(matchData: {
  matchId: string;
  round: number;
  team1Player1: string | null;
  team1Player2: string | null;
  team2Player1: string | null;
  team2Player2: string | null;
  winningTeam: number | null;
}) {
  try {
    await ensureUserAuthenticated();

    const match = await pb.collection('matches').update(matchData.matchId, {
      round: matchData.round,
      team1: [matchData.team1Player1, matchData.team1Player2],
      team2: [matchData.team2Player1, matchData.team2Player2],
      winningTeam: matchData.winningTeam,
    });

    return mapMatchData(match);
  } catch (error) {
    console.error('Error saving match:', error);
    throw error;
  }
}

export async function getMatches(tournamentId: string) {
  try {
    await ensureUserAuthenticated();

    const matches = await pb.collection('matches').getFullList({
      filter: `tournamentId = "${tournamentId}"`,
      sort: 'round',
      expand: 'team1,team2',
    });
    return matches.map(match => mapMatchData(match));
  } catch (error) {
    console.error('Error fetching matches:', error);
    throw error;
  }
}

function mapMatchData(match: any) {
  return {
    tournamentId: match.tournamentId,
    matchId: match.id,
    round: match.round,
    team1Player1: match?.expand?.team1?.[0] ? { id: match.expand.team1[0].id, playerName: match.expand.team1[0].playerName } : null,
    team1Player2: match?.expand?.team1?.[1] ? { id: match.expand.team1[1].id, playerName: match.expand.team1[1].playerName } : null,
    team2Player1: match?.expand?.team2?.[0] ? { id: match.expand.team2[0].id, playerName: match.expand.team2[0].playerName } : null,
    team2Player2: match?.expand?.team2?.[1] ? { id: match.expand.team2[1].id, playerName: match.expand.team2[1].playerName } : null,
    winningTeam: match.winningTeam,
  };
}

export async function deleteAllMatches(tournamentId: string) {
  try {
    await ensureUserAuthenticated();

    const matches = await getMatches(tournamentId);
    await Promise.all(matches.map(match => pb.collection('matches').delete(match.matchId)));
  } catch (error) {
    console.error('Error deleting matches:', error);
    throw error;
  }
}