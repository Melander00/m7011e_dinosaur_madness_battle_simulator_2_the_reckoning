import type { LeaderboardEntry, UserRank } from "./leaderboard";

export const mockTopPlayers: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "11111111-1111-1111-1111-111111111111",
    rankedPoints: 1800,
  },
  {
    rank: 2,
    userId: "22222222-2222-2222-2222-222222222222",
    rankedPoints: 1650,
  },
  {
    rank: 3,
    userId: "33333333-3333-3333-3333-333333333333",
    rankedPoints: 1500,
  },
];

export const mockMyRank: UserRank = {
  userId: "11111111-1111-1111-1111-111111111111",
  rank: 1,
  rankedPoints: 1800,
};
