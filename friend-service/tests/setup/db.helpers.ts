/**
 * Database Test Helpers
 * Provides utilities for database setup/teardown and mocking in tests
 */

import { jest } from '@jest/globals';
import { Pool, QueryResult, QueryResultRow } from 'pg';

// Test database connection pool (for integration tests)
let testPool: Pool | null = null;

/**
 * Test database configuration
 */
export const testDbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'test_friend_service',
};

/**
 * Initialize test database connection pool
 * Use this for integration tests that need a real database
 */
export async function initTestDatabase(): Promise<Pool> {
  if (testPool) {
    return testPool;
  }

  testPool = new Pool({
    ...testDbConfig,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Test connection
  try {
    await testPool.query('SELECT NOW()');
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }

  return testPool;
}

/**
 * Close test database connection pool
 */
export async function closeTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
    console.log('Test database connection closed');
  }
}

/**
 * Get the test database pool
 */
export function getTestPool(): Pool | null {
  return testPool;
}

/**
 * Clean all test data from database
 * Use in afterEach to ensure test isolation
 */
export async function cleanTestData(): Promise<void> {
  if (!testPool) {
    throw new Error('Test database not initialized');
  }

  // Delete in correct order to respect foreign key constraints
  await testPool.query('DELETE FROM gamePlayers');
  await testPool.query('DELETE FROM games');
  await testPool.query('DELETE FROM relationshipRequests');
  await testPool.query('DELETE FROM relationshipBlocked');
  await testPool.query('DELETE FROM relationships');
  await testPool.query('DELETE FROM ranks');
  await testPool.query('DELETE FROM users');
}

/**
 * Seed test users into database
 * @param userIds - Array of user IDs to create
 */
export async function seedTestUsers(userIds: string[]): Promise<void> {
  if (!testPool) {
    throw new Error('Test database not initialized');
  }

  for (const userId of userIds) {
    await testPool.query(
      'INSERT INTO users (userId) VALUES ($1) ON CONFLICT DO NOTHING',
      [userId]
    );
  }
}

/**
 * Seed a friendship between two users
 */
export async function seedFriendship(userId1: string, userId2: string): Promise<void> {
  if (!testPool) {
    throw new Error('Test database not initialized');
  }

  await testPool.query(
    'INSERT INTO relationships (userId1, userId2) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId1, userId2]
  );
}

/**
 * Seed a friend request
 * @param status - 0 = PENDING, 1 = ACCEPTED, 2 = REJECTED
 */
export async function seedFriendRequest(
  fromUserId: string,
  toUserId: string,
  status: number = 0
): Promise<void> {
  if (!testPool) {
    throw new Error('Test database not initialized');
  }

  await testPool.query(
    'INSERT INTO relationshipRequests (fromUserId, toUserId, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [fromUserId, toUserId, status]
  );
}

/**
 * Create a mock query function for unit tests
 * Returns a jest mock function that can be configured with expected results
 */
export function createMockQuery() {
  return jest.fn<any>();
}

/**
 * Mock query result helper
 * Creates a properly structured QueryResult object
 */
export function mockQueryResult<T extends QueryResultRow>(
  rows: T[],
  rowCount: number = rows.length
): QueryResult<T> {
  return {
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  };
}

/**
 * Create mock database module for unit tests
 */
export function createMockDbModule() {
  const mockQuery = createMockQuery();
  const mockPool = {
    query: mockQuery,
    connect: jest.fn<any>(),
    end: jest.fn<any>(),
    on: jest.fn<any>(),
  };

  return {
    pool: mockPool,
    query: mockQuery,
    healthCheck: jest.fn<any>().mockResolvedValue({ status: 'healthy', time: new Date() }),
  };
}

/**
 * Setup database mock for a test file
 * Returns the mock query function for configuring responses
 */
export function setupDbMock() {
  const dbMock = createMockDbModule();
  
  jest.mock('../../src/db', () => dbMock);
  
  return dbMock;
}
