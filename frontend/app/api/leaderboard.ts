// API helper for leaderboard service
// Adapted from Keycloak Tutorial Part 5: Protect Backend API

const API_BASE_URL = 'http://localhost:3005';

/**
 * Helper function to make authenticated requests to backend
 * Automatically adds JWT token to Authorization header
 */
const authFetch = async (url: string, token: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Get user's ELO score from leaderboard service
 * This is a protected endpoint - requires valid JWT token
 * 
 * @param token - JWT token from Keycloak
 * @param userId - User ID to fetch ELO for
 * @returns User's ELO data
 */
export const getUserElo = async (token: string, userId: string) => {
  return authFetch(`${API_BASE_URL}/elo/${userId}`, token);
};

// Add more leaderboard API functions here as needed:
// export const getGlobalLeaderboard = async (token: string) => { ... }
// export const getFriendLeaderboard = async (token: string) => { ... }
