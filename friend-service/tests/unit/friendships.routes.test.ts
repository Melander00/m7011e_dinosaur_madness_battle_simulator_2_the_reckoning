/**
 * Unit Tests for Friendships Routes
 * Tests all friendship-related API endpoints with mocked dependencies
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock dependencies before importing the router
const mockQuery = jest.fn<any>();

jest.mock('../../src/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    req.userId = '11111111-1111-1111-1111-111111111111';
    req.user = {
      sub: '11111111-1111-1111-1111-111111111111',
      email: 'user1@test.com',
    };
    next();
  },
}));

// Mock game invite service
const mockSendInvite = jest.fn<any>();
const mockGetReceivedInvites = jest.fn<any>();
const mockCancelInvite = jest.fn<any>();

jest.mock('../../src/services/game-invite-service', () => ({
  gameInviteService: {
    sendInvite: (...args: any[]) => mockSendInvite(...args),
    getReceivedInvites: (...args: any[]) => mockGetReceivedInvites(...args),
    cancelInvite: (...args: any[]) => mockCancelInvite(...args),
  },
}));

describe('Friendships Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import fresh router after mocks are set up
    const friendshipsRouter = require('../../src/routes/friendships').default;
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/friendships', friendshipsRouter);
    
    // Error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    // Reset invite mocks defaults
    mockSendInvite.mockResolvedValue({
      inviteId: 'inv_test_123',
      fromUserId: '11111111-1111-1111-1111-111111111111',
      toUserId: '22222222-2222-2222-2222-222222222222',
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
    });
    mockGetReceivedInvites.mockResolvedValue([]);
    mockCancelInvite.mockResolvedValue(true);
  });

  describe('GET /friendships', () => {
    describe('happy path', () => {
      it('should return empty friends list when user has no friends', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        const response = await request(app)
          .get('/friendships')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.friends).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      it('should return list of friends for authenticated user', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { userId: '22222222-2222-2222-2222-222222222222' },
            { userId: '33333333-3333-3333-3333-333333333333' },
          ],
          rowCount: 2,
        });

        const response = await request(app)
          .get('/friendships')
          .expect(200);

        expect(response.body.friends).toHaveLength(2);
        expect(response.body.count).toBe(2);
        expect(response.body.userId).toBe('11111111-1111-1111-1111-111111111111');
      });

      it('should query database with correct SQL', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await request(app).get('/friendships').expect(200);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          ['11111111-1111-1111-1111-111111111111']
        );
      });
    });

    describe('error cases', () => {
      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .get('/friendships')
          .expect(500);

        expect(response.body.error).toBe('Database connection failed');
      });
    });
  });

  describe('GET /friendships/count', () => {
    it('should return friend count of 0 for user with no friends', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/friendships/count')
        .expect(200);

      expect(response.body.friendCount).toBe(0);
    });

    it('should return correct friend count', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '15' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/friendships/count')
        .expect(200);

      expect(response.body.friendCount).toBe(15);
    });

    it('should parse count string to integer', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '42' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/friendships/count')
        .expect(200);

      expect(typeof response.body.friendCount).toBe('number');
      expect(response.body.friendCount).toBe(42);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/friendships/count')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /friendships/:userId', () => {
    it('should return friends for a specific user (public endpoint)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: '44444444-4444-4444-4444-444444444444' }],
        rowCount: 1,
      });

      const response = await request(app)
        .get('/friendships/33333333-3333-3333-3333-333333333333')
        .expect(200);

      expect(response.body.userId).toBe('33333333-3333-3333-3333-333333333333');
      expect(response.body.friends).toHaveLength(1);
    });

    it('should return empty list for user with no friends', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const response = await request(app)
        .get('/friendships/nonexistent-user-id')
        .expect(200);

      expect(response.body.friends).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/friendships/33333333-3333-3333-3333-333333333333')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('POST /friendships', () => {
    describe('happy path', () => {
      it('should create a new friendship', async () => {
        // Both users exist
        mockQuery.mockResolvedValueOnce({
          rows: [
            { userId: '11111111-1111-1111-1111-111111111111' },
            { userId: '22222222-2222-2222-2222-222222222222' },
          ],
          rowCount: 2,
        });
        // Insert friendship
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/friendships')
          .send({ userId: '22222222-2222-2222-2222-222222222222' })
          .expect(201);

        expect(response.body.message).toBe('Friendship created successfully');
        expect(response.body.friendship.userId1).toBe('11111111-1111-1111-1111-111111111111');
        expect(response.body.friendship.userId2).toBe('22222222-2222-2222-2222-222222222222');
      });
    });

    describe('validation errors', () => {
      it('should return 400 when userId is missing from body', async () => {
        const response = await request(app)
          .post('/friendships')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('userId is required in body');
      });

      it('should return 400 when trying to befriend yourself', async () => {
        const response = await request(app)
          .post('/friendships')
          .send({ userId: '11111111-1111-1111-1111-111111111111' })
          .expect(400);

        expect(response.body.error).toBe('Cannot create friendship with self');
      });
    });

    describe('user existence checks', () => {
      it('should return 404 when target user does not exist', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: '11111111-1111-1111-1111-111111111111' }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/friendships')
          .send({ userId: 'nonexistent-user-id' })
          .expect(404);

        expect(response.body.error).toBe('One or both users do not exist');
      });

      it('should return 404 when neither user exists', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        const response = await request(app)
          .post('/friendships')
          .send({ userId: '22222222-2222-2222-2222-222222222222' })
          .expect(404);

        expect(response.body.error).toBe('One or both users do not exist');
      });
    });

    describe('database errors', () => {
      it('should handle database errors during user check', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post('/friendships')
          .send({ userId: '22222222-2222-2222-2222-222222222222' })
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('DELETE /friendships/:userId', () => {
    describe('happy path', () => {
      it('should delete an existing friendship', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });

        const response = await request(app)
          .delete('/friendships/22222222-2222-2222-2222-222222222222')
          .expect(200);

        expect(response.body.message).toBe('Friendship deleted successfully');
        expect(response.body.deleted.userId1).toBe('11111111-1111-1111-1111-111111111111');
        expect(response.body.deleted.userId2).toBe('22222222-2222-2222-2222-222222222222');
      });
    });

    describe('error cases', () => {
      it('should return 404 when friendship does not exist', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        const response = await request(app)
          .delete('/friendships/22222222-2222-2222-2222-222222222222')
          .expect(404);

        expect(response.body.error).toBe('Friendship not found');
      });

      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .delete('/friendships/22222222-2222-2222-2222-222222222222')
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('GET /friendships/invite', () => {
    describe('happy path', () => {
      it('should return empty invites list when user has no invites', async () => {
        mockGetReceivedInvites.mockResolvedValueOnce([]);

        const response = await request(app)
          .get('/friendships/invite')
          .expect('Content-Type', /json/)
          .expect(200);

        expect(response.body.invites).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      it('should return list of received invites', async () => {
        const invites = [
          {
            inviteId: 'inv_1',
            fromUserId: '22222222-2222-2222-2222-222222222222',
            toUserId: '11111111-1111-1111-1111-111111111111',
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
          },
          {
            inviteId: 'inv_2',
            fromUserId: '33333333-3333-3333-3333-333333333333',
            toUserId: '11111111-1111-1111-1111-111111111111',
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
          },
        ];
        mockGetReceivedInvites.mockResolvedValueOnce(invites);

        const response = await request(app)
          .get('/friendships/invite')
          .expect(200);

        expect(response.body.invites).toHaveLength(2);
        expect(response.body.count).toBe(2);
        expect(response.body.userId).toBe('11111111-1111-1111-1111-111111111111');
      });
    });

    describe('error cases', () => {
      it('should handle service errors', async () => {
        mockGetReceivedInvites.mockRejectedValueOnce(new Error('Redis error'));

        const response = await request(app)
          .get('/friendships/invite')
          .expect(500);

        expect(response.body.error).toBe('Redis error');
      });
    });
  });

  describe('POST /friendships/invite', () => {
    describe('happy path', () => {
      it('should send a game invite to a friend', async () => {
        // User is a friend
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
          .expect(201);

        expect(response.body.message).toBe('Game invite sent successfully');
        expect(response.body.invite).toBeDefined();
        expect(response.body.invite.inviteId).toBe('inv_test_123');
      });

      it('should call gameInviteService.sendInvite with correct parameters', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        });

        await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
          .expect(201);

        expect(mockSendInvite).toHaveBeenCalledWith(
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222'
        );
      });
    });

    describe('validation errors', () => {
      it('should return 400 when toUserId is missing', async () => {
        const response = await request(app)
          .post('/friendships/invite')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('toUserId is required in body');
      });

      it('should return 400 when trying to invite yourself', async () => {
        const response = await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '11111111-1111-1111-1111-111111111111' })
          .expect(400);

        expect(response.body.error).toBe('Cannot invite yourself');
      });

      it('should return 400 when inviting non-friend', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '0' }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
          .expect(400);

        expect(response.body.error).toBe('You can only invite friends to play');
      });
    });

    describe('conflict errors', () => {
      it('should return 409 when user already has pending invite', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        });
        mockSendInvite.mockRejectedValueOnce(
          new Error('You already have a pending invite to this user')
        );

        const response = await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
          .expect(409);

        expect(response.body.error).toBe('You already have a pending invite to this user');
      });
    });

    describe('database errors', () => {
      it('should handle database errors during friendship check', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post('/friendships/invite')
          .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('DELETE /friendships/invite/:inviteId', () => {
    describe('happy path', () => {
      it('should cancel an existing invite', async () => {
        mockCancelInvite.mockResolvedValueOnce(true);

        const response = await request(app)
          .delete('/friendships/invite/inv_test_123')
          .expect(200);

        expect(response.body.message).toBe('Game invite cancelled successfully');
      });

      it('should call gameInviteService.cancelInvite with correct parameters', async () => {
        mockCancelInvite.mockResolvedValueOnce(true);

        await request(app)
          .delete('/friendships/invite/inv_test_123')
          .expect(200);

        expect(mockCancelInvite).toHaveBeenCalledWith(
          'inv_test_123',
          '11111111-1111-1111-1111-111111111111'
        );
      });
    });

    describe('error cases', () => {
      it('should return 404 when invite does not exist', async () => {
        mockCancelInvite.mockResolvedValueOnce(false);

        const response = await request(app)
          .delete('/friendships/invite/inv_nonexistent')
          .expect(404);

        expect(response.body.error).toBe('Invite not found or already expired');
      });

      it('should return 403 when trying to cancel someone elses invite', async () => {
        mockCancelInvite.mockRejectedValueOnce(
          new Error('You can only cancel your own invites')
        );

        const response = await request(app)
          .delete('/friendships/invite/inv_test_123')
          .expect(403);

        expect(response.body.error).toBe('You can only cancel your own invites');
      });

      it('should handle service errors', async () => {
        mockCancelInvite.mockRejectedValueOnce(new Error('Redis error'));

        const response = await request(app)
          .delete('/friendships/invite/inv_test_123')
          .expect(500);

        expect(response.body.error).toBe('Redis error');
      });
    });
  });
});
