import { query } from "../db";

export type UserRow = {
  userid: string;
  username: string | null;
  quote: string | null;
};

export async function upsertUser(userId: string, username: string | null): Promise<void> {
  // Keep it minimal: only touch username for now
  await query(
    `
    INSERT INTO users (userId, username)
    VALUES ($1, $2)
    ON CONFLICT (userId) DO UPDATE SET username = COALESCE(EXCLUDED.username, users.username)
    `,
    [userId, username]
  );
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `
    SELECT userId, username, quote
    FROM users
    WHERE userId = $1
    `,
    [userId]
  );
  return result.rows[0] ?? null;
}

