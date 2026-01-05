/**
 * Integration Tests for Friendships API
 * Tests the complete request/response cycle using supertest
 */

import { describe, test, expect, jest, beforeEach, beforeAll, afterAll, afterEach, it } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import {
  initTestDb,
  closeTestDb,
  cleanTestData,
  seedTestUsers,
  seedFriendship,
  testUserIds,
  friendshipExists,
  getFriendshipCount,
} from './setup';

// Test app and router
let app: Express;
let currentUserId: string = testUserIds.user1;

// Mock the auth middleware to use our test user
jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    // Use the currentUserId which can be changed per test
    req.userId = currentUserId;
    req.user = {
      sub: currentUserId,
      email: `${currentUserId}@test.com`,
      preferred_username: `testuser`,
    };
    next();
  },
}));

describe('Friendships API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database (container startup can take 30-60 seconds)
    await initTestDb();
    
    // Import router after mocks are set up
    const friendshipsRouter = require('../../src/routes/friendships').default;
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/friendships', friendshipsRouter);
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    // Clean and seed test data
    await cleanTestData();
    await seedTestUsers();
    currentUserId = testUserIds.user1;
  });

  afterEach(async () => {
    await cleanTestData();
  });

  describe('GET /friendships', () => {
    it('should return empty friends list for user with no friends', async () => {
      const response = await request(app)
        .get('/friendships')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.userId).toBe(testUserIds.user1);
      expect(response.body.friends).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return list of friends for user with friendships', async () => {
      // Seed friendships
      await seedFriendship(testUserIds.user1, testUserIds.user2);
      await seedFriendship(testUserIds.user1, testUserIds.user3);

      const response = await request(app)
        .get('/friendships')
        .expect(200);

      expect(response.body.friends).toHaveLength(2);
      expect(response.body.count).toBe(2);
      
      const friendIds = response.body.friends.map((f: any) => f.userId);
      expect(friendIds).toContain(testUserIds.user2);
      expect(friendIds).toContain(testUserIds.user3);
    });

    it('should return friends regardless of userId order in relationship', async () => {
      // User1 is userId1 in relationship
      await seedFriendship(testUserIds.user1, testUserIds.user2);
      // User1 is userId2 in relationship
      await seedFriendship(testUserIds.user3, testUserIds.user1);

      const response = await request(app)
        .get('/friendships')
        .expect(200);

      expect(response.body.friends).toHaveLength(2);
      
      const friendIds = response.body.friends.map((f: any) => f.userId);
      expect(friendIds).toContain(testUserIds.user2);
      expect(friendIds).toContain(testUserIds.user3);
    });
  });

  describe('GET /friendships/count', () => {
    it('should return 0 for user with no friends', async () => {
      const response = await request(app)
        .get('/friendships/count')
        .expect(200);

      expect(response.body.friendCount).toBe(0);
    });

    it('should return correct count for user with friends', async () => {
      await seedFriendship(testUserIds.user1, testUserIds.user2);
      await seedFriendship(testUserIds.user3, testUserIds.user1);
      await seedFriendship(testUserIds.user1, testUserIds.user4);

      const response = await request(app)
        .get('/friendships/count')
        .expect(200);

      expect(response.body.friendCount).toBe(3);
    });
  });

  describe('GET /friendships/:userId', () => {
    it('should return friends for a specific user', async () => {
      await seedFriendship(testUserIds.user2, testUserIds.user3);
      await seedFriendship(testUserIds.user2, testUserIds.user4);

      const response = await request(app)
        .get(`/friendships/${testUserIds.user2}`)
        .expect(200);

      expect(response.body.userId).toBe(testUserIds.user2);
      expect(response.body.friends).toHaveLength(2);
    });

    it('should return empty list for user with no friends', async () => {
      const response = await request(app)
        .get(`/friendships/${testUserIds.user4}`)
        .expect(200);

      expect(response.body.friends).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return empty list for non-existent user', async () => {
      const response = await request(app)
        .get('/friendships/00000000-0000-0000-0000-000000000000')
        .expect(200);

      expect(response.body.friends).toEqual([]);
    });
  });

  describe('POST /friendships', () => {
    it('should create a new friendship', async () => {
      const response = await request(app)
        .post('/friendships')
        .send({ userId: testUserIds.user2 })
        .expect(201);

      expect(response.body.message).toBe('Friendship created successfully');
      expect(response.body.friendship.userId1).toBe(testUserIds.user1);
      expect(response.body.friendship.userId2).toBe(testUserIds.user2);

      // Verify in database
      const exists = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(exists).toBe(true);
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/friendships')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('userId is required in body');
    });

    it('should return 400 when trying to friend yourself', async () => {
      const response = await request(app)
        .post('/friendships')
        .send({ userId: testUserIds.user1 })
        .expect(400);

      expect(response.body.error).toBe('Cannot create friendship with self');
    });

    it('should return 404 when target user does not exist', async () => {
      const response = await request(app)
        .post('/friendships')
        .send({ userId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(response.body.error).toBe('One or both users do not exist');
    });

    it('should handle duplicate friendship gracefully (ON CONFLICT)', async () => {
      // Create friendship first
      await seedFriendship(testUserIds.user1, testUserIds.user2);

      // Try to create again - should succeed due to ON CONFLICT DO NOTHING
      const response = await request(app)
        .post('/friendships')
        .send({ userId: testUserIds.user2 })
        .expect(201);

      expect(response.body.message).toBe('Friendship created successfully');
    });
  });

  describe('DELETE /friendships/:userId', () => {
    it('should delete an existing friendship', async () => {
      await seedFriendship(testUserIds.user1, testUserIds.user2);

      const response = await request(app)
        .delete(`/friendships/${testUserIds.user2}`)
        .expect(200);

      expect(response.body.message).toBe('Friendship deleted successfully');

      // Verify in database
      const exists = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(exists).toBe(false);
    });

    it('should delete friendship regardless of user order', async () => {
      // Create friendship where user1 is second
      await seedFriendship(testUserIds.user2, testUserIds.user1);

      const response = await request(app)
        .delete(`/friendships/${testUserIds.user2}`)
        .expect(200);

      expect(response.body.message).toBe('Friendship deleted successfully');
    });

    it('should return 404 when friendship does not exist', async () => {
      const response = await request(app)
        .delete(`/friendships/${testUserIds.user2}`)
        .expect(404);

      expect(response.body.error).toBe('Friendship not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests correctly', async () => {
      // Create multiple friendships simultaneously
      const promises = [
        request(app).post('/friendships').send({ userId: testUserIds.user2 }),
        request(app).post('/friendships').send({ userId: testUserIds.user3 }),
        request(app).post('/friendships').send({ userId: testUserIds.user4 }),
      ];

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify count
      const count = await getFriendshipCount(testUserIds.user1);
      expect(count).toBe(3);
    });

    it('should handle special characters in user IDs gracefully', async () => {
      // Invalid UUID format should return 500 (PostgreSQL rejects invalid UUIDs)
      const response = await request(app)
        .get('/friendships/invalid-uuid-format')
        .expect(500);

      // Should return error, not crash
      expect(response.body.error).toBeDefined();
    });
  });
});
