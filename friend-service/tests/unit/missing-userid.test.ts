/**
 * Unit Tests for Missing User ID Branches
 * Tests the !userId branches that occur when auth middleware doesn't set userId
 */

import { describe, expect, jest, beforeEach, it } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock dependencies
const mockQuery = jest.fn<any>();

jest.mock('../../src/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock keycloak to NOT set userId - simulating auth middleware failure
jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    // Intentionally not setting req.userId to test the !userId branches
    req.user = {
      sub: undefined,
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

describe('Friendships Routes - Missing userId branches', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const friendshipsRouter = require('../../src/routes/friendships').default;
    
    app = express();
    app.use(express.json());
    app.use('/friendships', friendshipsRouter);
    
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /friendships - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .get('/friendships')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('GET /friendships/invite - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .get('/friendships/invite')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('GET /friendships/count - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .get('/friendships/count')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('POST /friendships - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .post('/friendships')
        .send({ userId: '22222222-2222-2222-2222-222222222222' })
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('POST /friendships/invite - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .post('/friendships/invite')
        .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('DELETE /friendships/:userId - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .delete('/friendships/22222222-2222-2222-2222-222222222222')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('DELETE /friendships/invite/:inviteId - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .delete('/friendships/invite/inv_test_123')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });
});

describe('Friend Requests Routes - Missing userId branches', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const requestsRouter = require('../../src/routes/requests').default;
    
    app = express();
    app.use(express.json());
    app.use('/requests', requestsRouter);
    
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /requests/incoming - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .get('/requests/incoming')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('GET /requests/outgoing - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .get('/requests/outgoing')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('POST /requests - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .post('/requests')
        .send({ toUserId: '22222222-2222-2222-2222-222222222222' })
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('PUT /requests/:fromUserId/accept - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .put('/requests/22222222-2222-2222-2222-222222222222/accept')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('PUT /requests/:fromUserId/reject - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .put('/requests/22222222-2222-2222-2222-222222222222/reject')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });

  describe('DELETE /requests/:toUserId - missing userId', () => {
    it('should return 500 when userId is not set by auth middleware', async () => {
      const response = await request(app)
        .delete('/requests/22222222-2222-2222-2222-222222222222')
        .expect(500);

      expect(response.body.error).toBe('User ID not found in token');
    });
  });
});
