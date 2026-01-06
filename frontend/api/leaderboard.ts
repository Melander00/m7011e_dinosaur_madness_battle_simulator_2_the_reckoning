import { fetchJson } from "./http";

/**
 * Types exported for consumers (components)
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  rankedPoints: number;
}

export interface UserRank {
  userId: string;
  rank: number;
  rankedPoints: number;
}

/**
 * TEMP: mock toggle for frontend development
 * Set to false when real backend is available
 */
const USE_MOCKS = false;

/**
 * Mock data matching backend contract
 */
const mockTopPlayers: LeaderboardEntry[] = [
  { rank: 1, userId: "user-1", rankedPoints: 1800 },
  { rank: 2, userId: "user-2", rankedPoints: 1650 },
  { rank: 3, userId: "user-3", rankedPoints: 1500 },
];

const mockMyRank: UserRank = {
  userId: "user-1",
  rank: 1,
  rankedPoints: 1800,
};

/**
 * Public API functions
 */
export async function getTopPlayers(
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  if (USE_MOCKS) {
    return mockTopPlayers.slice(0, limit);
  }

  const data = await fetchJson<{ leaderboard: LeaderboardEntry[] }>(
    `/api/leaderboard/leaderboard/top?limit=${limit}`
  );
  return data.leaderboard;
}

export async function getMyRank(token: string): Promise<UserRank> {
  if (USE_MOCKS) {
    return mockMyRank;
  }

  return fetchJson<UserRank>("/leaderboard/leaderboard/me", { token });
}


