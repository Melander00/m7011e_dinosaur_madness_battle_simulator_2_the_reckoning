/**
 * Integration Test Database Setup (testcontainers)
 * 
 * This module:
 * 1. Starts an isolated PostgreSQL container for each test run
 * 2. Creates the required schema
 * 3. Provides a clean database for integration tests
 * 4. Ensures NO connection to production database
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer;
let pool: Pool;

// Test user IDs (valid UUIDs)
export const testUserIds = {
  user1: '11111111-1111-1111-1111-111111111111',
  user2: '22222222-2222-2222-2222-222222222222',
  user3: '33333333-3333-3333-3333-333333333333',
  user4: '44444444-4444-4444-4444-444444444444',
  admin: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
};

/**
 * Schema for integration tests
 * Only includes tables needed for friend-service
 */
const SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- User (required for foreign key references) --
  CREATE TABLE IF NOT EXISTS users (
      userId UUID PRIMARY KEY
  );

  -- Relationship (Friendships) --
  CREATE TABLE IF NOT EXISTS relationships (
      userId1 UUID NOT NULL,
      userId2 UUID NOT NULL,
      PRIMARY KEY (userId1, userId2),
      CONSTRAINT fk_rel_user1 FOREIGN KEY (userId1)
          REFERENCES users(userId)
          ON DELETE CASCADE,
      CONSTRAINT fk_rel_user2 FOREIGN KEY (userId2)
          REFERENCES users(userId)
          ON DELETE CASCADE,
      CONSTRAINT chk_not_same CHECK (userId1 <> userId2)
  );

  -- Blocking --
  CREATE TABLE IF NOT EXISTS relationshipBlocked (
      fromUserId UUID NOT NULL,
      toUserId UUID NOT NULL,
      PRIMARY KEY (fromUserId, toUserId),
      CONSTRAINT fk_block_from FOREIGN KEY (fromUserId)
          REFERENCES users(userId)
          ON DELETE CASCADE,
      CONSTRAINT fk_block_to FOREIGN KEY (toUserId)
          REFERENCES users(userId)
          ON DELETE CASCADE
  );

  -- Relationship Requests --
  CREATE TABLE IF NOT EXISTS relationshipRequests (
      fromUserId UUID NOT NULL,
      toUserId   UUID NOT NULL,
      status     INTEGER NOT NULL,
      PRIMARY KEY (fromUserId, toUserId),
      CONSTRAINT fk_req_from FOREIGN KEY (fromUserId)
          REFERENCES users(userId)
          ON DELETE CASCADE,
      CONSTRAINT fk_req_to FOREIGN KEY (toUserId)
          REFERENCES users(userId)
          ON DELETE CASCADE,
      CONSTRAINT chk_req_not_same CHECK (fromUserId <> toUserId)
  );
`;

/**
 * Start testcontainer and initialize schema
 * Called once before all integration tests
 */
export async function initTestDb(): Promise<Pool> {
  // If already initialized, return existing pool
  if (pool) {
    console.log('[Integration Tests] Reusing existing database connection');
    return pool;
  }

  console.log('[Integration Tests] Starting PostgreSQL container...');
  
  try {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .start();

    const connectionUri = container.getConnectionUri();
    console.log('[Integration Tests] Container started:', connectionUri);

    // Safety check: Ensure we're using testcontainer URL (localhost)
    if (!connectionUri.includes('localhost') && !connectionUri.includes('127.0.0.1')) {
      throw new Error('SAFETY: Integration tests must use localhost database');
    }

    // Set environment variable for the app to use
    process.env.DATABASE_URL = connectionUri;

    // Create connection pool
    pool = new Pool({ connectionString: connectionUri });

    // Initialize schema
    console.log('[Integration Tests] Creating schema...');
    await pool.query(SCHEMA);
    console.log('[Integration Tests] Schema created successfully');

    return pool;

  } catch (error) {
    console.error('[Integration Tests] Failed to start database:', error);
    throw new Error(`Test database setup failed: ${error}`);
  }
}

/**
 * Stop container and cleanup
 * Called once after all integration tests
 */
export async function closeTestDb(): Promise<void> {
  console.log('[Integration Tests] Cleaning up...');
  
  if (pool) {
    await pool.end();
  }
  
  if (container) {
    await container.stop();
    console.log('[Integration Tests] Container stopped');
  }
}

/**
 * Get database connection pool for tests
 */
export function getTestPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initTestDb() first.');
  }
  return pool;
}

/**
 * Clean all test data from the database (keeps schema)
 */
export async function cleanTestData(): Promise<void> {
  const testPool = getTestPool();
  
  // Delete in order respecting foreign key constraints
  await testPool.query('DELETE FROM relationshipRequests');
  await testPool.query('DELETE FROM relationshipBlocked');
  await testPool.query('DELETE FROM relationships');
}

/**
 * Seed test users into database
 */
export async function seedTestUsers(userIds: string[] = Object.values(testUserIds)): Promise<void> {
  const testPool = getTestPool();
  
  for (const userId of userIds) {
    await pool.query(
      'INSERT INTO users (userId) VALUES ($1) ON CONFLICT (userId) DO NOTHING',
      [userId]
    );
  }
}

/**
 * Seed a friendship between two users
 */
export async function seedFriendship(userId1: string, userId2: string): Promise<void> {
  const pool = getTestPool();
  
  await pool.query(
    'INSERT INTO relationships (userId1, userId2) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId1, userId2]
  );
}

/**
 * Seed a friend request
 * @param status 0=PENDING, 1=ACCEPTED, 2=REJECTED
 */
export async function seedFriendRequest(
  fromUserId: string,
  toUserId: string,
  status: number = 0
): Promise<void> {
  const pool = getTestPool();
  
  await pool.query(
    `INSERT INTO relationshipRequests (fromUserId, toUserId, status) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (fromUserId, toUserId) DO UPDATE SET status = $3`,
    [fromUserId, toUserId, status]
  );
}

/**
 * Get count of friendships for a user
 */
export async function getFriendshipCount(userId: string): Promise<number> {
  const pool = getTestPool();
  
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM relationships WHERE userId1 = $1 OR userId2 = $1',
    [userId]
  );
  
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get count of friend requests for a user (as recipient)
 */
export async function getIncomingRequestCount(userId: string): Promise<number> {
  const pool = getTestPool();
  
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM relationshipRequests WHERE toUserId = $1 AND status = 0',
    [userId]
  );
  
  return parseInt(result.rows[0].count, 10);
}

/**
 * Check if a friendship exists
 */
export async function friendshipExists(userId1: string, userId2: string): Promise<boolean> {
  const pool = getTestPool();
  
  const result = await pool.query(
    `SELECT 1 FROM relationships 
     WHERE (userId1 = $1 AND userId2 = $2) OR (userId1 = $2 AND userId2 = $1)`,
    [userId1, userId2]
  );
  
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Check if a friend request exists
 */
export async function friendRequestExists(
  fromUserId: string,
  toUserId: string,
  status?: number
): Promise<boolean> {
  const pool = getTestPool();
  
  let query = 'SELECT 1 FROM relationshipRequests WHERE fromUserId = $1 AND toUserId = $2';
  const params: any[] = [fromUserId, toUserId];
  
  if (status !== undefined) {
    query += ' AND status = $3';
    params.push(status);
  }
  
  const result = await pool.query(query, params);
  
  return result.rowCount !== null && result.rowCount > 0;
}
