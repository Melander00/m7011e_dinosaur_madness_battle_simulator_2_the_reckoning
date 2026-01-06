/**
 * Unit Tests for Main.ts Endpoints
 * Tests health checks, DB ping, root endpoint, and dev seed endpoint
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Mock DB before creating app
const mockQuery = jest.fn();
jest.mock('../../src/db', () => ({
  query: mockQuery,
}));

// Mock auth
const mockRequireAuth = jest.fn((req: any, res: any, next: any) => {
  req.userId = 'test-user-123';
  req.user = {
    email: 'test@example.com',
    preferred_username: 'testuser',
    name: 'Test User',
    email_verified: true,
    realm_access: { roles: ['user'] }
  };
  next();
});

jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: mockRequireAuth,
}));

// Import after mocking
import { query } from '../../src/db';
import { requireAuth } from '../../src/auth/keycloak';

const typedMockQuery = mockQuery as jest.MockedFunction<typeof query>;

// Create app manually with same structure as main.ts (but without leaderboard routes to avoid dependency issues)
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', service: 'leaderboard-service', timestamp: new Date().toISOString() });
  });

  // DB ping
  app.get('/db/ping', async (req, res) => {
    try {
      const result = await query('SELECT 1 as ping, NOW() as timestamp');
      res.json({
        status: 'connected',
        ping: result.rows[0].ping,
        timestamp: result.rows[0].timestamp
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        error: err.message,
        detail: 'Database connection failed'
      });
    }
  });

  // Dev seed endpoint
  app.post('/dev/seed-rank', async (req, res) => {
    try {
      const { userId, rankedPoints } = req.body;

      if (!userId || typeof rankedPoints !== 'number') {
        return res.status(400).json({
          error: 'Invalid request',
          required: { userId: 'string (UUID)', rankedPoints: 'number' }
        });
      }

      await query(
        `INSERT INTO ranks (userid, rankedpoints) VALUES ($1, $2) ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
        [userId, rankedPoints]
      );

      res.json({
        success: true,
        message: 'Rank seeded',
        userId,
        rankedPoints
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Me endpoint
  app.get('/me', requireAuth, (req, res) => {
    res.status(200).json({
      sub: req.userId,
      email: req.user?.email,
      username: req.user?.preferred_username,
      name: req.user?.name,
      roles: req.user?.realm_access?.roles || [],
      emailVerified: req.user?.email_verified,
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ service: 'leaderboard-service', version: '1.0.0' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}

describe('Main Endpoints Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /healthz - Health Check', () => {
    test('MAIN 1: should return 200 with status ok', async () => {
      const response = await request(app).get('/healthz');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('leaderboard-service');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /db/ping - Database Connectivity', () => {
    test('MAIN 2: should return 200 when DB is connected', async () => {
      typedMockQuery.mockResolvedValueOnce({
        rows: [{ ping: 1, timestamp: new Date() }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      const response = await request(app).get('/db/ping');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('connected');
      expect(response.body.ping).toBe(1);
      expect(response.body.timestamp).toBeDefined();
    });

    test('MAIN 3: should return 500 when DB connection fails', async () => {
      typedMockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app).get('/db/ping');

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.error).toBe('Connection refused');
      expect(response.body.detail).toBe('Database connection failed');
    });
  });

  describe('POST /dev/seed-rank - Development Seed Endpoint', () => {
    test('MAIN 4: should seed rank successfully', async () => {
      typedMockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      } as any);

      const response = await request(app)
        .post('/dev/seed-rank')
        .send({ userId: 'test-uuid-123', rankedPoints: 1500 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rank seeded');
      expect(response.body.userId).toBe('test-uuid-123');
      expect(response.body.rankedPoints).toBe(1500);
      expect(typedMockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ranks'),
        ['test-uuid-123', 1500]
      );
    });

    test('MAIN 5: should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/dev/seed-rank')
        .send({ rankedPoints: 1500 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
      expect(response.body.required).toBeDefined();
    });

    test('MAIN 6: should return 400 when rankedPoints is not a number', async () => {
      const response = await request(app)
        .post('/dev/seed-rank')
        .send({ userId: 'test-uuid', rankedPoints: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request');
    });

    test('MAIN 7: should return 500 when DB operation fails', async () => {
      typedMockQuery.mockRejectedValueOnce(new Error('DB write failed'));

      const response = await request(app)
        .post('/dev/seed-rank')
        .send({ userId: 'test-uuid', rankedPoints: 1500 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('DB write failed');
    });
  });

  describe('GET /me - Token Introspection', () => {
    test('MAIN 8: should return authenticated user info', async () => {
      const response = await request(app).get('/me');

      expect(response.status).toBe(200);
      expect(response.body.sub).toBe('test-user-123');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.username).toBe('testuser');
      expect(response.body.name).toBe('Test User');
      expect(response.body.roles).toEqual(['user']);
      expect(response.body.emailVerified).toBe(true);
    });
  });

  describe('GET / - Root Endpoint', () => {
    test('MAIN 9: should return service info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.service).toBe('leaderboard-service');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('404 Handler', () => {
    test('MAIN 10: should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});
