const API_BASE_URL = import.meta.env.PROD
  ? "https://leaderboard-dev.ltu-m7011e-1.se"
  : "http://localhost:3005";

type FetchOptions = RequestInit & { token?: string };

const fetchJson = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

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

export interface UserInfo {
  userId: string;
  quote: string | null;
  profilePicture: string | null;
  profileBanner: string | null;
}

export const getTopPlayers = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  const data = await fetchJson<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard/top?limit=${limit}`);
  return data.leaderboard;
};

export const getMyRank = async (token: string): Promise<UserRank> => {
  return fetchJson<UserRank>("/leaderboard/me", { token });
};
