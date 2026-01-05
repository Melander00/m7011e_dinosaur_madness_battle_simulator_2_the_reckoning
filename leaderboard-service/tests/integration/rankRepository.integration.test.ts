/**
 * Integration Tests for RankRepository
 * 
 * These tests verify SQL correctness against a REAL PostgreSQL database.
 * Database is provided by testcontainers (isolated, ephemeral).
 * 
 * What we test:
 * - SQL syntax correctness
 * - Window function behavior (RANK() OVER)
 * - Ordering and filtering logic
 * - Data integrity constraints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as rankRepo from '../../src/repositories/rankRepository';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  cleanDatabase, 
  seedTestData,
  toUUID 
} from './setup/testDb';

// Mock the db module to use testcontainer connection
jest.mock('../../src/db', () => {
  const { getTestPool } = require('./setup/testDb');
  return {
    query: async (text: string, params?: any[]) => {
      const pool = getTestPool();
      return pool.query(text, params);
    },
  };
});

describe('RankRepository Integration Tests', () => {
  // Setup: Start container and create schema
  beforeAll(async () => {
    await setupTestDatabase();
  }, 60000); // 60s timeout for container startup

  // Teardown: Stop container
  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Clean data between tests
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('getTop - Real SQL Verification', () => {
    test('INTEGRATION 1: should return users ordered by rankedPoints DESC', async () => {
      // Seed test data
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1800 },
        { userId: 'user-2', rankedPoints: 1500 },
        { userId: 'user-3', rankedPoints: 2000 },
        { userId: 'user-4', rankedPoints: 1200 },
      ]);

      // Execute real query
      const results = await rankRepo.getTop(10);

      // Verify ordering
      expect(results).toHaveLength(4);
      expect(results[0].userid).toBe(toUUID('user-3')); // 2000 points
      expect(Number(results[0].rank)).toBe(1);
      expect(results[1].userid).toBe(toUUID('user-1')); // 1800 points
      expect(Number(results[1].rank)).toBe(2);
      expect(results[2].userid).toBe(toUUID('user-2')); // 1500 points
      expect(Number(results[2].rank)).toBe(3);
      expect(results[3].userid).toBe(toUUID('user-4')); // 1200 points
      expect(Number(results[3].rank)).toBe(4);
    });

    test('INTEGRATION 2: should respect limit parameter', async () => {
      // Seed 10 users
      const users = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        rankedPoints: 1000 + i * 100,
      }));
      await seedTestData(users);

      // Request only top 3
      const results = await rankRepo.getTop(3);

      expect(results).toHaveLength(3);
      expect(results[0].rankedpoints).toBe(1900); // Highest
    });

    test('INTEGRATION 3: should handle empty table', async () => {
      const results = await rankRepo.getTop(10);
      expect(results).toHaveLength(0);
    });

    test('INTEGRATION 4: should handle ties in rankedPoints', async () => {
      // Two users with same points
      await seedTestData([
        { userId: 'aaaa-0000-0000-0001', rankedPoints: 1500 },
        { userId: 'bbbb-0000-0000-0002', rankedPoints: 1500 },
        { userId: 'cccc-0000-0000-0003', rankedPoints: 1600 },
      ]);

      const results = await rankRepo.getTop(10);

      expect(results).toHaveLength(3);
      // Highest points gets rank 1
      expect(Number(results[0].rank)).toBe(1);
      expect(results[0].rankedpoints).toBe(1600);
      // Tied users get sequential ranks (tie broken by userId ASC)
      expect(Number(results[1].rank)).toBe(2);
      expect(Number(results[2].rank)).toBe(3);
    });
  });

  describe('getMe - Real SQL Verification', () => {
    test('INTEGRATION 5: should return user rank and points', async () => {
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1800 },
        { userId: 'user-2', rankedPoints: 1500 },
        { userId: 'target-user', rankedPoints: 1600 },
      ]);

      const result = await rankRepo.getMe(toUUID('target-user'));

      expect(result).not.toBeNull();
      expect(result!.userid).toBe(toUUID('target-user'));
      expect(result!.rankedpoints).toBe(1600);
      expect(Number(result!.rank)).toBe(2); // Between 1800 (rank 1) and 1500 (rank 3)
    });

    test('INTEGRATION 6: should return null for non-existent user', async () => {
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1500 },
      ]);

      const result = await rankRepo.getMe(toUUID('non-existent-user'));

      expect(result).toBeNull();
    });

    test('INTEGRATION 7: should calculate correct rank in large dataset', async () => {
      // Create 100 users with points 1000-1099
      const users = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${String(i).padStart(3, '0')}`,
        rankedPoints: 1000 + i,
      }));
      await seedTestData(users);

      // User with 1050 points should be rank 50
      const result = await rankRepo.getMe(toUUID('user-050'));

      expect(result).not.toBeNull();
      expect(result!.rankedpoints).toBe(1050);
      expect(Number(result!.rank)).toBe(50); // 49 users above (1051-1099)
    });
  });

  describe('getNearby - Real SQL Verification', () => {
    test('INTEGRATION 8: should return users within range of target user', async () => {
      // Create leaderboard: ranks 1-7
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1700 }, // rank 1
        { userId: 'user-2', rankedPoints: 1600 }, // rank 2
        { userId: 'user-3', rankedPoints: 1500 }, // rank 3
        { userId: 'target', rankedPoints: 1400 },  // rank 4 (target)
        { userId: 'user-5', rankedPoints: 1300 }, // rank 5
        { userId: 'user-6', rankedPoints: 1200 }, // rank 6
        { userId: 'user-7', rankedPoints: 1100 }, // rank 7
      ]);

      // Get users within range 2 of target (ranks 2-6)
      const results = await rankRepo.getNearby(toUUID('target'), 2);

      expect(results).toHaveLength(5);
      expect(results.map(r => Number(r.rank))).toEqual([2, 3, 4, 5, 6]);
      expect(results[2].userid).toBe(toUUID('target')); // Target is at index 2
    });

    test('INTEGRATION 9: should handle range extending beyond bounds', async () => {
      // Only 3 users, target is rank 2
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1500 },
        { userId: 'target', rankedPoints: 1400 },
        { userId: 'user-3', rankedPoints: 1300 },
      ]);

      // Request range 10 (should return all 3)
      const results = await rankRepo.getNearby(toUUID('target'), 10);

      expect(results).toHaveLength(3);
    });

    test('INTEGRATION 10: should return empty array for non-existent user', async () => {
      await seedTestData([
        { userId: 'user-1', rankedPoints: 1500 },
      ]);

      const results = await rankRepo.getNearby(toUUID('non-existent'), 5);

      expect(results).toHaveLength(0);
    });

    test('INTEGRATION 11: should include target user at rank 1', async () => {
      await seedTestData([
        { userId: 'top-player', rankedPoints: 2000 },
        { userId: 'user-2', rankedPoints: 1900 },
        { userId: 'user-3', rankedPoints: 1800 },
      ]);

      // Top player has no one above them
      const results = await rankRepo.getNearby(toUUID('top-player'), 2);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].userid).toBe(toUUID('top-player'));
      expect(Number(results[0].rank)).toBe(1);
    });
  });

  describe('Repository Capping Behavior', () => {
    test('INTEGRATION 12: repository should cap limit at 100', async () => {
      // Create 150 users
      const users = Array.from({ length: 150 }, (_, i) => ({
        userId: `user-${i}`,
        rankedPoints: 1000 + i,
      }));
      await seedTestData(users);

      // Request 200, should get max 100
      const results = await rankRepo.getTop(200);

      expect(results).toHaveLength(100);
    });

    test('INTEGRATION 13: repository should cap range at 50', async () => {
      // Create 200 users
      const users = Array.from({ length: 200 }, (_, i) => ({
        userId: `user-${String(i).padStart(3, '0')}`,
        rankedPoints: 1000 + i,
      }));
      await seedTestData(users);

      // Target at rank 100, request range 100 (should cap at 50)
      const results = await rankRepo.getNearby(toUUID('user-100'), 100);

      // Range 50 means 50 above + target + 50 below = max 101 users
      // But rank 100 has only 99 above and 100 below
      // So expect users from rank 50 to rank 150 (101 users)
      expect(results.length).toBeLessThanOrEqual(101);
    });
  });
});

/**
 * INTEGRATION TEST SUMMARY
 * 
 * These tests verify:
 * 1. ✅ SQL syntax is correct (queries execute successfully)
 * 2. ✅ Window functions work (RANK() OVER)
 * 3. ✅ Ordering is correct (rankedPoints DESC)
 * 4. ✅ Filtering logic works (LIMIT, BETWEEN)
 * 5. ✅ Edge cases handled (empty table, ties, boundaries)
 * 6. ✅ Repository capping behavior (limit 100, range 50)
 * 
 * Database: Real PostgreSQL via testcontainers
 * Isolation: Each test run gets fresh container
 * Safety: No production database access (testcontainer only)
 */
