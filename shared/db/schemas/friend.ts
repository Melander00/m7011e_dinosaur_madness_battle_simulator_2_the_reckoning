/**
 * Friend Service Database Schema
 * Tables: USER_RELATIONSHIP, RelationshipRequests
 */

type QueryFunction = <T = any>(text: string, params?: any[]) => Promise<any>;

export async function initialize(query: QueryFunction): Promise<void> {
  // Create USER_RELATIONSHIP table
  await query(`
    CREATE TABLE IF NOT EXISTS "USER_RELATIONSHIP" (
      "userID1" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
      "userID2" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY ("userID1", "userID2"),
      CHECK ("userID1" < "userID2")
    );
  `);

  // Create RelationshipRequests table
  await query(`
    CREATE TABLE IF NOT EXISTS "RelationshipRequests" (
      id SERIAL PRIMARY KEY,
      "fromUserID" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
      "toUserID" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE ("fromUserID", "toUserID"),
      CHECK ("fromUserID" != "toUserID")
    );
  `);

  // Create indexes for efficient lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_relationship_user1 
    ON "USER_RELATIONSHIP"("userID1");
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_relationship_user2 
    ON "USER_RELATIONSHIP"("userID2");
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_relationship_requests_to 
    ON "RelationshipRequests"("toUserID");
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_relationship_requests_from 
    ON "RelationshipRequests"("fromUserID");
  `);
}
