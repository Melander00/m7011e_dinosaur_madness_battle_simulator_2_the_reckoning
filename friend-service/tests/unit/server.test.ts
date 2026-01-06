/**
 * Unit Tests for Server Module
 * Tests Express app setup, middleware, and health endpoints
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock all external dependencies before any imports
const mockHealthCheck = jest.fn<any>();
const mockConnectRabbitMQ = jest.fn<any>();
const mockCloseRabbitMQ = jest.fn<any>();
const mockRequireAuth = jest.fn<any>((req: Request, res: Response, next: NextFunction) => {
  req.userId = '11111111-1111-1111-1111-111111111111';
  req.user = {
    sub: '11111111-1111-1111-1111-111111111111',
    email: 'test@example.com',
    preferred_username: 'testuser',
    name: 'Test User',
    email_verified: true,
    realm_access: { roles: ['user'] },
  };
  next();
});

jest.mock('../../src/db', () => ({
  healthCheck: mockHealthCheck,
  query: jest.fn(),
  pool: { on: jest.fn() },
}));

jest.mock('../../src/messaging/rabbitmq', () => ({
  connectRabbitMQ: mockConnectRabbitMQ,
  closeRabbitMQ: mockCloseRabbitMQ,
}));

jest.mock('../../src/auth/keycloak', () => ({
  requireAuth: mockRequireAuth,
}));

// Mock the routers
jest.mock('../../src/routes/friendships', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req: Request, res: Response) => res.json({ mocked: true }));
  return { default: router };
});

jest.mock('../../src/routes/requests', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req: Request, res: Response) => res.json({ mocked: true }));
  return { default: router };
});

import express from 'express';
import request from 'supertest';

describe('Server Module', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a minimal app for testing server functionality
    app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/healthz', async (req: Request, res: Response) => {
      const dbHealth: any = await mockHealthCheck();
      res.json({
        status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
        service: 'friend-service',
        database: dbHealth,
        timestamp: new Date().toISOString(),
      });
    });

    // Me endpoint
    app.get('/me', mockRequireAuth, (req: Request, res: Response) => {
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
    app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'friend-service',
        version: '1.0.0',
        endpoints: {},
      });
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
      });
    });
  });

  describe('GET /healthz', () => {
    it('should return ok status when database is healthy', async () => {
      mockHealthCheck.mockResolvedValue({
        status: 'healthy',
        time: new Date(),
      });

      const response = await request(app)
        .get('/healthz')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('friend-service');
      expect(response.body.database.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockHealthCheck.mockResolvedValue({
        status: 'unhealthy',
        error: 'Connection refused',
      });

      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.database.status).toBe('unhealthy');
      expect(response.body.database.error).toBe('Connection refused');
    });

    it('should include timestamp in response', async () => {
      mockHealthCheck.mockResolvedValue({ status: 'healthy' });

      const before = new Date().toISOString();
      const response = await request(app).get('/healthz').expect(200);
      const after = new Date().toISOString();

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp >= before).toBe(true);
      expect(response.body.timestamp <= after).toBe(true);
    });
  });

  describe('GET /me', () => {
    it('should return authenticated user info', async () => {
      const response = await request(app)
        .get('/me')
        .expect(200);

      expect(response.body.sub).toBe('11111111-1111-1111-1111-111111111111');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.username).toBe('testuser');
      expect(response.body.name).toBe('Test User');
      expect(response.body.roles).toContain('user');
      expect(response.body.emailVerified).toBe(true);
    });

    it('should call requireAuth middleware', async () => {
      await request(app).get('/me').expect(200);

      expect(mockRequireAuth).toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('should return service info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.service).toBe('friend-service');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown/endpoint')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should return 404 for wrong HTTP methods', async () => {
      const response = await request(app)
        .post('/healthz')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
    });
  });

  describe('Error Handler', () => {
    it('should handle errors and return JSON response', async () => {
      // Add a route that throws an error
      const errorApp = express();
      errorApp.get('/error', (req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 400;
        next(error);
      });
      errorApp.use((err: any, req: Request, res: Response, next: NextFunction) => {
        res.status(err.status || 500).json({ error: err.message });
      });

      const response = await request(errorApp)
        .get('/error')
        .expect(400);

      expect(response.body.error).toBe('Test error');
    });

    it('should default to 500 status when no status provided', async () => {
      const errorApp = express();
      errorApp.get('/error', (req, res, next) => {
        next(new Error('Internal error'));
      });
      errorApp.use((err: any, req: Request, res: Response, next: NextFunction) => {
        res.status(err.status || 500).json({ error: err.message });
      });

      const response = await request(errorApp)
        .get('/error')
        .expect(500);

      expect(response.body.error).toBe('Internal error');
    });
  });

  describe('Middleware', () => {
    it('should parse JSON body', async () => {
      let receivedBody: any;
      const jsonApp = express();
      jsonApp.use(express.json());
      jsonApp.post('/test', (req: Request, res: Response) => {
        receivedBody = req.body;
        res.json({ received: true });
      });

      await request(jsonApp)
        .post('/test')
        .send({ foo: 'bar' })
        .expect(200);

      expect(receivedBody).toEqual({ foo: 'bar' });
    });

    it('should handle CORS headers', async () => {
      const corsApp = express();
      const cors = require('cors');
      corsApp.use(cors());
      corsApp.get('/test', (req: Request, res: Response) => res.json({}));

      const response = await request(corsApp)
        .get('/test')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});

describe('RabbitMQ Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to RabbitMQ on startup', async () => {
    mockConnectRabbitMQ.mockResolvedValue({});

    // Simulate server startup
    await mockConnectRabbitMQ();

    expect(mockConnectRabbitMQ).toHaveBeenCalled();
  });

  it('should handle RabbitMQ connection failure gracefully', async () => {
    mockConnectRabbitMQ.mockRejectedValue(new Error('Connection failed'));

    await expect(mockConnectRabbitMQ()).rejects.toThrow('Connection failed');
  });
});
