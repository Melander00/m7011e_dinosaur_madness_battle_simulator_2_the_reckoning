/**
 * Unit Tests for Friend Requests Routes
 * Tests all friend request-related API endpoints with mocked dependencies
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock dependencies before importing
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

describe('Friend Requests Routes', () => {
  let app: Express;

  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';
  const user3Id = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();

    // Import fresh router
    const requestsRouter = require('../../src/routes/requests').default;

    app = express();
    app.use(express.json());
    app.use('/requests', requestsRouter);
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /requests/incoming', () => {
    describe('happy path', () => {
      it('should return empty list when no incoming requests', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        const response = await request(app)
          .get('/requests/incoming')
          .expect(200);

        expect(response.body.requests).toEqual([]);
        expect(response.body.count).toBe(0);
        expect(response.body.userId).toBe(user1Id);
      });

      it('should return pending incoming requests', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { fromUserId: user2Id, status: 0 },
            { fromUserId: user3Id, status: 0 },
          ],
          rowCount: 2,
        });

        const response = await request(app)
          .get('/requests/incoming')
          .expect(200);

        expect(response.body.requests).toHaveLength(2);
        expect(response.body.count).toBe(2);
      });

      it('should only query for PENDING status (0)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        await request(app).get('/requests/incoming').expect(200);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('status = $2'),
          [user1Id, 0] // 0 = PENDING
        );
      });
    });

    describe('error cases', () => {
      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .get('/requests/incoming')
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('GET /requests/outgoing', () => {
    describe('happy path', () => {
      it('should return empty list when no outgoing requests', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [],
          rowCount: 0,
        });

        const response = await request(app)
          .get('/requests/outgoing')
          .expect(200);

        expect(response.body.requests).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      it('should return all outgoing requests regardless of status', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [
            { toUserId: user2Id, status: 0 }, // PENDING
            { toUserId: user3Id, status: 1 }, // ACCEPTED
          ],
          rowCount: 2,
        });

        const response = await request(app)
          .get('/requests/outgoing')
          .expect(200);

        expect(response.body.requests).toHaveLength(2);
      });
    });
  });

  describe('POST /requests', () => {
    describe('happy path', () => {
      it('should create a new friend request', async () => {
        // Both users exist
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: user1Id }, { userId: user2Id }],
          rowCount: 2,
        });
        // Not already friends
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // No pending request
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // Insert request
        mockQuery.mockResolvedValueOnce({
          rows: [{ fromUserId: user1Id, toUserId: user2Id, status: 0 }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/requests')
          .send({ toUserId: user2Id })
          .expect(201);

        expect(response.body.message).toBe('Friend request sent successfully');
        expect(response.body.request.fromUserId).toBe(user1Id);
        expect(response.body.request.toUserId).toBe(user2Id);
        expect(response.body.request.status).toBe(0);
      });
    });

    describe('validation errors', () => {
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
          .send({ toUserId: user1Id })
          .expect(400);

        expect(response.body.error).toBe('Cannot send friend request to yourself');
      });
    });

    describe('business logic validation', () => {
      it('should return 404 when target user does not exist', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: user1Id }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/requests')
          .send({ toUserId: user2Id })
          .expect(404);

        expect(response.body.error).toBe('One or both users do not exist');
      });

      it('should return 400 when users are already friends', async () => {
        // Both users exist
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: user1Id }, { userId: user2Id }],
          rowCount: 2,
        });
        // Already friends
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId1: user1Id, userId2: user2Id }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/requests')
          .send({ toUserId: user2Id })
          .expect(400);

        expect(response.body.error).toBe('Users are already friends');
      });

      it('should return 400 when pending request already exists', async () => {
        // Both users exist
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: user1Id }, { userId: user2Id }],
          rowCount: 2,
        });
        // Not already friends
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // Pending request exists
        mockQuery.mockResolvedValueOnce({
          rows: [{ fromUserId: user1Id, toUserId: user2Id, status: 0 }],
          rowCount: 1,
        });

        const response = await request(app)
          .post('/requests')
          .send({ toUserId: user2Id })
          .expect(400);

        expect(response.body.error).toBe('Friend request already sent');
      });

      it('should return 400 on unique constraint violation', async () => {
        // Both users exist
        mockQuery.mockResolvedValueOnce({
          rows: [{ userId: user1Id }, { userId: user2Id }],
          rowCount: 2,
        });
        // Not already friends
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // No pending request
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // Insert fails with unique constraint
        const dbError: any = new Error('Unique violation');
        dbError.code = '23505';
        mockQuery.mockRejectedValueOnce(dbError);

        const response = await request(app)
          .post('/requests')
          .send({ toUserId: user2Id })
          .expect(400);

        expect(response.body.error).toBe('Friend request already exists');
      });
    });
  });

  describe('PUT /requests/:fromUserId/accept', () => {
    describe('happy path', () => {
      it('should accept a pending friend request', async () => {
        // Request exists
        mockQuery.mockResolvedValueOnce({
          rows: [{ fromUserId: user2Id, toUserId: user1Id, status: 0 }],
          rowCount: 1,
        });
        // Create friendship
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
        // Update request status
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const response = await request(app)
          .put(`/requests/${user2Id}/accept`)
          .expect(200);

        expect(response.body.message).toBe('Friend request accepted');
        expect(response.body.friendship.userId1).toBe(user2Id);
        expect(response.body.friendship.userId2).toBe(user1Id);
      });

      it('should execute queries in correct order', async () => {
        // Request exists
        mockQuery.mockResolvedValueOnce({
          rows: [{ fromUserId: user2Id, toUserId: user1Id, status: 0 }],
          rowCount: 1,
        });
        // Create friendship
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
        // Update request status
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await request(app).put(`/requests/${user2Id}/accept`).expect(200);

        expect(mockQuery).toHaveBeenCalledTimes(3);
        // First call: get request
        expect(mockQuery.mock.calls[0][0]).toContain('SELECT');
        // Second call: insert friendship
        expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO relationships');
        // Third call: update status
        expect(mockQuery.mock.calls[2][0]).toContain('UPDATE');
      });
    });

    describe('error cases', () => {
      it('should return 404 when request not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const response = await request(app)
          .put(`/requests/${user2Id}/accept`)
          .expect(404);

        expect(response.body.error).toBe('Friend request not found or already processed');
      });

      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .put(`/requests/${user2Id}/accept`)
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('PUT /requests/:fromUserId/reject', () => {
    describe('happy path', () => {
      it('should reject a pending friend request', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const response = await request(app)
          .put(`/requests/${user2Id}/reject`)
          .expect(200);

        expect(response.body.message).toBe('Friend request rejected');
      });

      it('should update status to REJECTED (2)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await request(app).put(`/requests/${user2Id}/reject`).expect(200);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE'),
          [2, user2Id, user1Id, 0] // 2 = REJECTED, 0 = PENDING
        );
      });
    });

    describe('error cases', () => {
      it('should return 404 when request not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const response = await request(app)
          .put(`/requests/${user2Id}/reject`)
          .expect(404);

        expect(response.body.error).toBe('Friend request not found or already processed');
      });
    });
  });

  describe('DELETE /requests/:toUserId', () => {
    describe('happy path', () => {
      it('should cancel a sent friend request', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        const response = await request(app)
          .delete(`/requests/${user2Id}`)
          .expect(200);

        expect(response.body.message).toBe('Friend request cancelled');
      });

      it('should delete with correct parameters', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

        await request(app).delete(`/requests/${user2Id}`).expect(200);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('DELETE'),
          [user1Id, user2Id]
        );
      });
    });

    describe('error cases', () => {
      it('should return 404 when request not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const response = await request(app)
          .delete(`/requests/${user2Id}`)
          .expect(404);

        expect(response.body.error).toBe('Friend request not found');
      });

      it('should handle database errors', async () => {
        mockQuery.mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .delete(`/requests/${user2Id}`)
          .expect(500);

        expect(response.body.error).toBe('Database error');
      });
    });
  });

  describe('GET /requests/outgoing - additional error cases', () => {
    it('should handle database errors on outgoing', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/requests/outgoing')
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('PUT /requests/:fromUserId/reject - additional error cases', () => {
    it('should handle database errors on reject', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put(`/requests/${user2Id}/reject`)
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('PUT /requests/:fromUserId/accept - additional error cases', () => {
    it('should handle database errors on accept', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put(`/requests/${user2Id}/accept`)
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });
});
