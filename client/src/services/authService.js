import axios from 'axios';

// Get authentication status from the server
export const getAuthStatus = async () => {
  try {
    const response = await axios.get('/api/auth/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching auth status:', error);
    throw error;
  }
};

// Logout from source account only
export const logoutSource = async () => {
  try {
    await axios.get('/api/auth/logout/source');
    return true;
  } catch (error) {
    console.error('Error during source logout:', error);
    throw error;
  }
};

// Logout from destination account only
export const logoutDestination = async () => {
  try {
    await axios.get('/api/auth/logout/destination');
    return true;
  } catch (error) {
    console.error('Error during destination logout:', error);
    throw error;
  }
};

// Logout from both accounts
export const logout = async () => {
  try {
    await axios.get('/api/auth/logout');
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};