/**
 * Matchmaking Service Database Schema
 * Tables: matchmaking_queue
 */

type QueryFunction = <T = any>(text: string, params?: any[]) => Promise<any>;

export async function initialize(query: QueryFunction): Promise<void> {
  // Create matchmaking_queue table
  await query(`
    CREATE TABLE IF NOT EXISTS "matchmaking_queue" (
      "userId" TEXT PRIMARY KEY,
      elo INTEGER NOT NULL,
      queue_start_time TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create index for efficient elo-based queries
  await query(`
    CREATE INDEX IF NOT EXISTS idx_matchmaking_elo 
    ON "matchmaking_queue"(elo);
  `);

  // Create index for queue time sorting
  await query(`
    CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_time 
    ON "matchmaking_queue"(queue_start_time);
  `);
}
