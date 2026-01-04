/**
 * User Service Database Schema
 * Tables: USER
 */

type QueryFunction = <T = any>(text: string, params?: any[]) => Promise<any>;

export async function initialize(query: QueryFunction): Promise<void> {
  // Create USER table (shared by multiple services)
  await query(`
    CREATE TABLE IF NOT EXISTS "USER" (
      "userID" SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create index for efficient username lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_username 
    ON "USER"(username);
  `);
}
