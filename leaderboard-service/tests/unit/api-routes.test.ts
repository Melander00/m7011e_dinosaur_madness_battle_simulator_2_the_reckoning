import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

/**
 * API ROUTE TESTS (Unit Tests)
 * 
 * These tests verify that the API correctly handles both success and failure scenarios:
 * - Success: Valid inputs return expected responses
 * - Failure: Invalid auth, missing users, etc. return appropriate errors
 * - Graceful degradation: Invalid pagination defaults to sensible values
 * 
 * We mock the database layer to test route logic independently.
 */

// Mock the rank repository
jest.mock('../../src/repositories/rankRepository', () => ({
  getTop: jest.fn(),
  getMe: jest.fn(),
  getNearby: jest.fn(),
}));

// Mock Keycloak auth to test auth failure scenarios
jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: jest.fn((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }
    
    // Set userId from token (for testing)
    req.userId = parts[1];
    next();
  }),
}));

import * as rankRepo from '../../src/repositories/rankRepository';
import leaderboardRouter from '../../src/routes/leaderboard';

const mockGetTop = rankRepo.getTop as jest.MockedFunction<typeof rankRepo.getTop>;
const mockGetMe = rankRepo.getMe as jest.MockedFunction<typeof rankRepo.getMe>;
const mockGetNearby = rankRepo.getNearby as jest.MockedFunction<typeof rankRepo.getNearby>;

describe('Leaderboard API Route Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create Express app with actual routes
    app = express();
    app.use(express.json());
    app.use('/leaderboard', leaderboardRouter);
  });

  // ==================== SUCCESS CASES ====================

  describe('GET /leaderboard/top - Success Cases', () => {
    test('SUCCESS 1: should return top 10 by default', async () => {
      const mockData = [
        { rank: 1, userid: 'user-1', rankedpoints: 1800 },
        { rank: 2, userid: 'user-2', rankedpoints: 1700 },
        { rank: 3, userid: 'user-3', rankedpoints: 1600 },
      ];
      mockGetTop.mockResolvedValue(mockData);

      const response = await request(app).get('/leaderboard/top');

      expect(response.status).toBe(200);
      expect(response.body.leaderboard).toHaveLength(3);
      expect(response.body.leaderboard[0]).toEqual({
        rank: 1,
        userId: 'user-1',
        rankedPoints: 1800,
      });
      expect(response.body.count).toBe(3);
      expect(mockGetTop).toHaveBeenCalledWith(10); // Default limit
    });

    test('SUCCESS 2: should respect custom limit', async () => {
      mockGetTop.mockResolvedValue([]);

      const response = await request(app).get('/leaderboard/top?limit=25');

      expect(response.status).toBe(200);
      expect(mockGetTop).toHaveBeenCalledWith(25);
    });

    test('SUCCESS 3: should cap limit at 100', async () => {
      mockGetTop.mockResolvedValue([]);

      const response = await request(app).get('/leaderboard/top?limit=150');

      expect(response.status).toBe(200);
      expect(mockGetTop).toHaveBeenCalledWith(100);
    });
  });

  describe('GET /leaderboard/me - Success Cases', () => {
    test('SUCCESS 4: should return authenticated user rank', async () => {
      mockGetMe.mockResolvedValue({
        rank: 42,
        userid: 'test-user-id',
        rankedpoints: 1234,
      });

      const response = await request(app)
        .get('/leaderboard/me')
        .set('Authorization', 'Bearer test-user-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: 'test-user-id',
        rank: 42,
        rankedPoints: 1234,
      });
      expect(mockGetMe).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /leaderboard/nearby - Success Cases', () => {
    test('SUCCESS 5: should return nearby players with default range', async () => {
      const mockData = [
        { rank: 40, userid: 'user-a', rankedpoints: 1250 },
        { rank: 41, userid: 'user-b', rankedpoints: 1240 },
        { rank: 42, userid: 'test-user-id', rankedpoints: 1234 },
        { rank: 43, userid: 'user-c', rankedpoints: 1220 },
      ];
      mockGetNearby.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/leaderboard/nearby')
        .set('Authorization', 'Bearer test-user-id');

      expect(response.status).toBe(200);
      expect(response.body.nearby).toHaveLength(4);
      expect(response.body.nearby[2].isCurrentUser).toBe(true);
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 5); // Default range
    });

    test('SUCCESS 6: should respect custom range', async () => {
      mockGetNearby.mockResolvedValue([
        { rank: 1, userid: 'test-user-id', rankedpoints: 2000 },
      ]);

      const response = await request(app)
        .get('/leaderboard/nearby?range=10')
        .set('Authorization', 'Bearer test-user-id');

      expect(response.status).toBe(200);
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 10);
    });

    test('SUCCESS 7: should cap range at 50', async () => {
      mockGetNearby.mockResolvedValue([
        { rank: 1, userid: 'test-user-id', rankedpoints: 2000 },
      ]);

      const response = await request(app)
        .get('/leaderboard/nearby?range=100')
        .set('Authorization', 'Bearer test-user-id');

      expect(response.status).toBe(200);
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 50);
    });
  });

  // ==================== FAILURE CASES ====================

  describe('GET /leaderboard/top - Input Validation', () => {
    test('FAIL 1: should default to 10 for negative limit (graceful degradation)', async () => {
      mockGetTop.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/leaderboard/top')
        .query({ limit: '-10' });

      expect(response.status).toBe(200);
      expect(mockGetTop).toHaveBeenCalledWith(10); // Defaults to 10
    });

    test('FAIL 2: should default to 10 for zero limit (graceful degradation)', async () => {
      mockGetTop.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/leaderboard/top')
        .query({ limit: '0' });

      expect(response.status).toBe(200);
      expect(mockGetTop).toHaveBeenCalledWith(10); // Defaults to 10
    });

    test('FAIL 3: should default to 10 for non-numeric limit (graceful degradation)', async () => {
      mockGetTop.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/leaderboard/top')
        .query({ limit: 'abc' });

      expect(response.status).toBe(200);
      expect(mockGetTop).toHaveBeenCalledWith(10); // Defaults to 10
    });
  });

  describe('GET /leaderboard/me - Authentication Failures', () => {
    test('FAIL 4: should return 401 without Authorization header', async () => {
      const response = await request(app)
        .get('/leaderboard/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(mockGetMe).not.toHaveBeenCalled();
    });

    test('FAIL 5: should return 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/leaderboard/me')
        .set('Authorization', 'NotBearerFormat');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
      expect(mockGetMe).not.toHaveBeenCalled();
    });

    test('FAIL 6: should return 404 when user not found in leaderboard', async () => {
      mockGetMe.mockResolvedValue(null);

      const response = await request(app)
        .get('/leaderboard/me')
        .set('Authorization', 'Bearer test-user-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
      expect(response.body.userId).toBe('test-user-id');
      expect(mockGetMe).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /leaderboard/nearby - Authentication & Validation', () => {
    test('FAIL 7: should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/leaderboard/nearby');

      expect(response.status).toBe(401);
      expect(mockGetNearby).not.toHaveBeenCalled();
    });

    test('FAIL 8: should default to 5 for negative range (graceful degradation)', async () => {
      mockGetNearby.mockResolvedValue([{ rank: 1, userid: 'test', rankedpoints: 1000 }]);
      
      const response = await request(app)
        .get('/leaderboard/nearby')
        .set('Authorization', 'Bearer test-user-id')
        .query({ range: '-5' });

      expect(response.status).toBe(200);
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 5); // Defaults to 5
    });

    test('FAIL 9: should return 404 when user not in leaderboard', async () => {
      mockGetNearby.mockResolvedValue([]);

      const response = await request(app)
        .get('/leaderboard/nearby')
        .set('Authorization', 'Bearer test-user-id')
        .query({ range: '5' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 5);
    });
  });

  describe('Boundary Testing', () => {
    test('EDGE 1: routes should cap limit at 100', async () => {
      mockGetTop.mockResolvedValue([]);

      await request(app)
        .get('/leaderboard/top')
        .query({ limit: '9999' });

      // Route caps at 100 (not repository)
      expect(mockGetTop).toHaveBeenCalledWith(100);
    });

    test('EDGE 2: routes should cap range at 50', async () => {
      mockGetNearby.mockResolvedValue([{ rank: 1, userid: 'test', rankedpoints: 1000 }]);

      await request(app)
        .get('/leaderboard/nearby')
        .set('Authorization', 'Bearer test-user-id')
        .query({ range: '9999' });

      // Route caps at 50 (not repository)
      expect(mockGetNearby).toHaveBeenCalledWith('test-user-id', 50);
    });
  });
});


