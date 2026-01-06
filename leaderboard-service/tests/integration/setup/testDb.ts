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

/**
 * Schema for integration tests
 * Matches production schema but runs in isolated container
 */
const SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  CREATE TABLE IF NOT EXISTS users (
      userId UUID PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS ranks (
      userId UUID PRIMARY KEY,
      rankedPoints INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT fk_rank_user FOREIGN KEY (userId)
          REFERENCES users(userId)
          ON DELETE CASCADE
  );
`;

/**
 * Start testcontainer and initialize schema
 * Called once before all integration tests
 */
export async function setupTestDatabase(): Promise<void> {
  console.log('[Integration Tests] Starting PostgreSQL container...');
  
  try {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .start();

    const connectionUri = container.getConnectionUri();
    console.log('[Integration Tests] Container started:', connectionUri);

    // Safety check: Ensure we're using testcontainer URL
    if (!connectionUri.includes('localhost') && !connectionUri.includes('127.0.0.1')) {
      throw new Error('SAFETY: Integration tests must use localhost database');
    }

    // Set environment variable for tests
    process.env.DATABASE_URL = connectionUri;

    // Create connection pool
    pool = new Pool({ connectionString: connectionUri });

    // Initialize schema
    console.log('[Integration Tests] Creating schema...');
    await pool.query(SCHEMA);
    console.log('[Integration Tests] Schema created successfully');

  } catch (error) {
    console.error('[Integration Tests] Failed to start database:', error);
    throw new Error(`Test database setup failed: ${error}`);
  }
}

/**
 * Stop container and cleanup
 * Called once after all integration tests
 */
export async function teardownTestDatabase(): Promise<void> {
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
 * Clean all data between tests (keeps schema)
 */
export async function cleanDatabase(): Promise<void> {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  await pool.query('TRUNCATE TABLE ranks CASCADE');
  await pool.query('TRUNCATE TABLE users CASCADE');
}

/**
 * Get database connection pool for tests
 */
export function getTestPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call setupTestDatabase() first.');
  }
  return pool;
}

/**
 * Convert simple test IDs to valid UUIDs
 * e.g., "user-1" -> "00000001-0000-0000-0000-757365722d3100"
 * EXPORTED for use in test files
 */
export function toUUID(id: string): string {
  // If already a valid UUID, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  
  // Convert string to hex representation (each char becomes 2 hex digits)
  let hex = '';
  for (let i = 0; i < id.length && hex.length < 24; i++) {
    hex += id.charCodeAt(i).toString(16).padStart(2, '0');
  }
  // Pad to 24 hex chars if needed
  hex = hex.padEnd(24, '0');
  
  // Format as UUID: 8-4-4-4-12
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32).padEnd(12, '0')}`;
}

/**
 * Seed test data helper
 * Automatically converts simple user IDs to valid UUIDs for PostgreSQL
 */
export async function seedTestData(users: Array<{ userId: string; rankedPoints: number }>): Promise<void> {
  const testPool = getTestPool();
  
  for (const user of users) {
    const uuid = toUUID(user.userId);
    await testPool.query('INSERT INTO users (userId) VALUES ($1)', [uuid]);
    await testPool.query(
      'INSERT INTO ranks (userId, rankedPoints) VALUES ($1, $2)',
      [uuid, user.rankedPoints]
    );
  }
}
