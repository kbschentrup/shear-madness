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
    await ensureUserAuthenticated();
    
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
