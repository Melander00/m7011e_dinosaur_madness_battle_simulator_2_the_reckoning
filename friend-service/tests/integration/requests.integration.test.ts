/**
 * Integration Tests for Friend Requests API
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
  seedFriendRequest,
  testUserIds,
  friendshipExists,
  friendRequestExists,
  getIncomingRequestCount,
} from './setup';

// Test app and router
let app: Express;
let currentUserId: string = testUserIds.user1;

// Mock the auth middleware to use our test user
jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    req.userId = currentUserId;
    req.user = {
      sub: currentUserId,
      email: `${currentUserId}@test.com`,
      preferred_username: `testuser`,
    };
    next();
  },
}));

describe('Friend Requests API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database (container startup can take 30-60 seconds)
    await initTestDb();
    
    const requestsRouter = require('../../src/routes/requests').default;
    
    app = express();
    app.use(express.json());
    app.use('/requests', requestsRouter);
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanTestData();
    await seedTestUsers();
    currentUserId = testUserIds.user1;
  });

  afterEach(async () => {
    await cleanTestData();
  });

  describe('GET /requests/incoming', () => {
    it('should return empty list when no incoming requests', async () => {
      const response = await request(app)
        .get('/requests/incoming')
        .expect(200);

      expect(response.body.requests).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return pending incoming requests', async () => {
      await seedFriendRequest(testUserIds.user2, testUserIds.user1, 0);
      await seedFriendRequest(testUserIds.user3, testUserIds.user1, 0);

      const response = await request(app)
        .get('/requests/incoming')
        .expect(200);

      expect(response.body.requests).toHaveLength(2);
      expect(response.body.count).toBe(2);
      
      const fromUserIds = response.body.requests.map((r: any) => r.fromuserid);
      expect(fromUserIds).toContain(testUserIds.user2);
      expect(fromUserIds).toContain(testUserIds.user3);
    });

    it('should NOT return accepted or rejected requests', async () => {
      await seedFriendRequest(testUserIds.user2, testUserIds.user1, 0); // PENDING
      await seedFriendRequest(testUserIds.user3, testUserIds.user1, 1); // ACCEPTED
      await seedFriendRequest(testUserIds.user4, testUserIds.user1, 2); // REJECTED

      const response = await request(app)
        .get('/requests/incoming')
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.requests[0].fromuserid).toBe(testUserIds.user2);
    });
  });

  describe('GET /requests/outgoing', () => {
    it('should return empty list when no outgoing requests', async () => {
      const response = await request(app)
        .get('/requests/outgoing')
        .expect(200);

      expect(response.body.requests).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return all outgoing requests (all statuses)', async () => {
      await seedFriendRequest(testUserIds.user1, testUserIds.user2, 0); // PENDING
      await seedFriendRequest(testUserIds.user1, testUserIds.user3, 1); // ACCEPTED
      await seedFriendRequest(testUserIds.user1, testUserIds.user4, 2); // REJECTED

      const response = await request(app)
        .get('/requests/outgoing')
        .expect(200);

      expect(response.body.requests).toHaveLength(3);
    });
  });

  describe('POST /requests', () => {
    it('should create a new friend request', async () => {
      const response = await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      expect(response.body.message).toBe('Friend request sent successfully');
      expect(response.body.request.fromuserid).toBe(testUserIds.user1);
      expect(response.body.request.touserid).toBe(testUserIds.user2);
      expect(response.body.request.status).toBe(0);

      // Verify in database
      const exists = await friendRequestExists(testUserIds.user1, testUserIds.user2, 0);
      expect(exists).toBe(true);
    });

    it('should return 400 when toUserId is missing', async () => {
      const response = await request(app)
        .post('/requests')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('toUserId is required');
    });

    it('should return 400 when sending request to yourself', async () => {
      const response = await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user1 })
        .expect(400);

      expect(response.body.error).toBe('Cannot send friend request to yourself');
    });

    it('should return 404 when target user does not exist', async () => {
      const response = await request(app)
        .post('/requests')
        .send({ toUserId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      expect(response.body.error).toBe('One or both users do not exist');
    });

    it('should return 400 when users are already friends', async () => {
      await seedFriendship(testUserIds.user1, testUserIds.user2);

      const response = await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(400);

      expect(response.body.error).toBe('Users are already friends');
    });

    it('should return 400 when pending request already exists', async () => {
      await seedFriendRequest(testUserIds.user1, testUserIds.user2, 0);

      const response = await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(400);

      expect(response.body.error).toBe('Friend request already sent');
    });
  });

  describe('PUT /requests/:fromUserId/accept', () => {
    it('should accept a pending friend request', async () => {
      await seedFriendRequest(testUserIds.user2, testUserIds.user1, 0);

      const response = await request(app)
        .put(`/requests/${testUserIds.user2}/accept`)
        .expect(200);

      expect(response.body.message).toBe('Friend request accepted');
      expect(response.body.friendship.userId1).toBe(testUserIds.user2);
      expect(response.body.friendship.userId2).toBe(testUserIds.user1);

      // Verify friendship was created
      const friendshipCreated = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(friendshipCreated).toBe(true);

      // Verify request status was updated
      const requestStillPending = await friendRequestExists(testUserIds.user2, testUserIds.user1, 0);
      expect(requestStillPending).toBe(false);
    });

    it('should return 404 when request does not exist', async () => {
      const response = await request(app)
        .put(`/requests/${testUserIds.user2}/accept`)
        .expect(404);

      expect(response.body.error).toBe('Friend request not found or already processed');
    });

    it('should return 404 when request is already processed', async () => {
      await seedFriendRequest(testUserIds.user2, testUserIds.user1, 1); // ACCEPTED

      const response = await request(app)
        .put(`/requests/${testUserIds.user2}/accept`)
        .expect(404);

      expect(response.body.error).toBe('Friend request not found or already processed');
    });
  });

  describe('PUT /requests/:fromUserId/reject', () => {
    it('should reject a pending friend request', async () => {
      await seedFriendRequest(testUserIds.user2, testUserIds.user1, 0);

      const response = await request(app)
        .put(`/requests/${testUserIds.user2}/reject`)
        .expect(200);

      expect(response.body.message).toBe('Friend request rejected');

      // Verify no friendship was created
      const friendshipCreated = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(friendshipCreated).toBe(false);

      // Verify request status was updated to REJECTED (2)
      const wasRejected = await friendRequestExists(testUserIds.user2, testUserIds.user1, 2);
      expect(wasRejected).toBe(true);
    });

    it('should return 404 when request does not exist', async () => {
      const response = await request(app)
        .put(`/requests/${testUserIds.user2}/reject`)
        .expect(404);

      expect(response.body.error).toBe('Friend request not found or already processed');
    });
  });

  describe('DELETE /requests/:toUserId', () => {
    it('should cancel a sent friend request', async () => {
      await seedFriendRequest(testUserIds.user1, testUserIds.user2, 0);

      const response = await request(app)
        .delete(`/requests/${testUserIds.user2}`)
        .expect(200);

      expect(response.body.message).toBe('Friend request cancelled');

      // Verify request was deleted
      const exists = await friendRequestExists(testUserIds.user1, testUserIds.user2);
      expect(exists).toBe(false);
    });

    it('should return 404 when request does not exist', async () => {
      const response = await request(app)
        .delete(`/requests/${testUserIds.user2}`)
        .expect(404);

      expect(response.body.error).toBe('Friend request not found');
    });

    it('should delete request regardless of status', async () => {
      // Even rejected requests can be deleted
      await seedFriendRequest(testUserIds.user1, testUserIds.user2, 2);

      const response = await request(app)
        .delete(`/requests/${testUserIds.user2}`)
        .expect(200);

      expect(response.body.message).toBe('Friend request cancelled');
    });
  });

  describe('Complete Friend Request Flow', () => {
    it('should handle full friend request acceptance flow', async () => {
      // User1 sends request to User2
      currentUserId = testUserIds.user1;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      // User2 sees the incoming request
      currentUserId = testUserIds.user2;
      const incomingResponse = await request(app)
        .get('/requests/incoming')
        .expect(200);
      
      expect(incomingResponse.body.requests).toHaveLength(1);
      expect(incomingResponse.body.requests[0].fromuserid).toBe(testUserIds.user1);

      // User2 accepts the request
      await request(app)
        .put(`/requests/${testUserIds.user1}/accept`)
        .expect(200);

      // Verify friendship exists
      const areFriends = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(areFriends).toBe(true);

      // No more incoming requests
      const afterAccept = await request(app)
        .get('/requests/incoming')
        .expect(200);
      
      expect(afterAccept.body.count).toBe(0);
    });

    it('should handle full friend request rejection flow', async () => {
      // User1 sends request to User2
      currentUserId = testUserIds.user1;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      // User2 rejects the request
      currentUserId = testUserIds.user2;
      await request(app)
        .put(`/requests/${testUserIds.user1}/reject`)
        .expect(200);

      // Verify no friendship
      const areFriends = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(areFriends).toBe(false);
    });

    it('should handle friend request cancellation flow', async () => {
      // User1 sends request to User2
      currentUserId = testUserIds.user1;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      // User1 cancels the request
      await request(app)
        .delete(`/requests/${testUserIds.user2}`)
        .expect(200);

      // User2 should not see any incoming requests
      currentUserId = testUserIds.user2;
      const incoming = await request(app)
        .get('/requests/incoming')
        .expect(200);
      
      expect(incoming.body.count).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle switching between users correctly', async () => {
      // User1 sends to User2
      currentUserId = testUserIds.user1;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      // User2 sends to User3
      currentUserId = testUserIds.user2;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user3 })
        .expect(201);

      // User3 sends to User1
      currentUserId = testUserIds.user3;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user1 })
        .expect(201);

      // Verify User1 incoming
      currentUserId = testUserIds.user1;
      const user1Incoming = await request(app)
        .get('/requests/incoming')
        .expect(200);
      
      expect(user1Incoming.body.count).toBe(1);
      expect(user1Incoming.body.requests[0].fromuserid).toBe(testUserIds.user3);
    });

    it('should handle mutual friend requests correctly', async () => {
      // User1 sends to User2
      currentUserId = testUserIds.user1;
      await request(app)
        .post('/requests')
        .send({ toUserId: testUserIds.user2 })
        .expect(201);

      // User2 tries to send to User1 (should fail - pending request exists from User1)
      currentUserId = testUserIds.user2;
      
      // User2 should just accept User1's request instead of sending a new one
      await request(app)
        .put(`/requests/${testUserIds.user1}/accept`)
        .expect(200);

      // Now they're friends
      const areFriends = await friendshipExists(testUserIds.user1, testUserIds.user2);
      expect(areFriends).toBe(true);
    });
  });
});
