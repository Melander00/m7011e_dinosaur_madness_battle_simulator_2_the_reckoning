/**
 * Test Application Factory
 * Creates Express app instances for testing with mocked dependencies
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { TestUser, testUsers, createMockAuthMiddleware } from './auth.helpers';

/**
 * Create a test Express application with optional auth mocking
 */
export function createTestApp(options: {
  mockAuth?: boolean;
  authUser?: TestUser | null;
} = {}): Express {
  const { mockAuth = true, authUser = testUsers.user1 } = options;

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Mock auth middleware if enabled
  if (mockAuth && authUser) {
    // Override requireAuth globally for this app instance
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Store the mock user for routes that use requireAuth
      (req as any).__mockAuthUser = authUser;
      next();
    });
  }

  return app;
}

/**
 * Mock error handler for testing
 */
export function testErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Test error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
}

/**
 * Create 404 handler for testing
 */
export function testNotFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Endpoint not found' });
}

/**
 * Helper to make authenticated requests in tests
 */
export interface TestRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: any;
  headers?: Record<string, string>;
  user?: TestUser;
}
