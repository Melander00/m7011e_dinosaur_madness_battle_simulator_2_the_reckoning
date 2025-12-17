/**
 * Rank Repository
 * Queries the ranks table using raw SQL
 * Table: ranks(userId UUID, rankedPoints INTEGER) - defined in db/migrations/V1__init.sql
 */

import { query } from '../db';

export type RankRow = {
  userid: string; // UUID as string
  rankedpoints: number;
  rank: number;
};

/**
 * Get top N players by rankedPoints
 * @param limit Max number of results (capped at 100)
 * @returns Array of {userid, rankedpoints, rank}
 */
export async function getTop(limit: number): Promise<RankRow[]> {
  const capped = Math.max(1, Math.min(limit, 100));
  
  const { rows } = await query(
    `SELECT 
       userid,
       rankedpoints,
       RANK() OVER (ORDER BY rankedpoints DESC, userid ASC) as rank
     FROM ranks
     ORDER BY rank ASC
     LIMIT $1`,
    [capped]
  );
  
  return rows;
}

/**
 * Get rank and points for a specific user (by Keycloak sub)
 * @param userId Keycloak sub (UUID)
 * @returns {userid, rankedpoints, rank} or null if not found
 */
export async function getMe(userId: string): Promise<RankRow | null> {
  const { rows } = await query(
    `SELECT userid, rankedpoints, rank FROM (
       SELECT 
         userid,
         rankedpoints,
         RANK() OVER (ORDER BY rankedpoints DESC, userid ASC) as rank
       FROM ranks
     ) t
     WHERE userid = $1
     LIMIT 1`,
    [userId]
  );
  
  return rows[0] ?? null;
}

/**
 * Get players near a specific user's rank (e.g., 5 above and 5 below)
 * @param userId Keycloak sub (UUID)
 * @param range Number of players above and below to return (default: 5)
 * @returns Array of {userid, rankedpoints, rank} including the user and nearby players
 */
export async function getNearby(userId: string, range: number = 5): Promise<RankRow[]> {
  const cappedRange = Math.max(1, Math.min(range, 50)); // Cap at 50 to prevent abuse
  
  const { rows } = await query(
    `WITH ranked_users AS (
       SELECT 
         userid,
         rankedpoints,
         RANK() OVER (ORDER BY rankedpoints DESC, userid ASC) as rank
       FROM ranks
     ),
     user_rank AS (
       SELECT rank FROM ranked_users WHERE userid = $1
     )
     SELECT 
       ranked_users.userid,
       ranked_users.rankedpoints,
       ranked_users.rank
     FROM ranked_users, user_rank
     WHERE ranked_users.rank BETWEEN (user_rank.rank - $2) AND (user_rank.rank + $2)
     ORDER BY ranked_users.rank ASC`,
    [userId, cappedRange]
  );
  
  return rows;
}
