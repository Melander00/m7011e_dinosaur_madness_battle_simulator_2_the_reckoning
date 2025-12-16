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
         "userId" as userid,
         "rankedPoints" as rankedpoints,
         RANK() OVER (ORDER BY "rankedPoints" DESC, "userId" ASC) as rank
       FROM ranks
     ) t
     WHERE userid = $1
     LIMIT 1`,
    [userId]
  );
  
  return rows[0] ?? null;
}
