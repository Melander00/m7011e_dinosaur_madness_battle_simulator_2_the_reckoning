/**
 * Authentication Test Helpers
 * Provides utilities for mocking Keycloak JWT authentication in tests
 */

import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Test secret for signing mock JWTs
export const TEST_JWT_SECRET = 'test-secret-key-for-testing-only';

/**
 * User roles for testing different permission levels
 */
export enum TestUserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

/**
 * Interface for test user configuration
 */
export interface TestUser {
  sub: string;           // Keycloak user ID (UUID)
  email?: string;
  preferred_username?: string;
  name?: string;
  email_verified?: boolean;
  realm_access?: {
    roles: string[];
  };
}

/**
 * Default test users for common testing scenarios
 */
export const testUsers = {
  user1: {
    sub: '11111111-1111-1111-1111-111111111111',
    email: 'user1@test.com',
    preferred_username: 'testuser1',
    name: 'Test User One',
    email_verified: true,
    realm_access: { roles: [TestUserRole.USER] },
  } as TestUser,
  
  user2: {
    sub: '22222222-2222-2222-2222-222222222222',
    email: 'user2@test.com',
    preferred_username: 'testuser2',
    name: 'Test User Two',
    email_verified: true,
    realm_access: { roles: [TestUserRole.USER] },
  } as TestUser,
  
  user3: {
    sub: '33333333-3333-3333-3333-333333333333',
    email: 'user3@test.com',
    preferred_username: 'testuser3',
    name: 'Test User Three',
    email_verified: true,
    realm_access: { roles: [TestUserRole.USER] },
  } as TestUser,
  
  admin: {
    sub: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'admin@test.com',
    preferred_username: 'admin',
    name: 'Admin User',
    email_verified: true,
    realm_access: { roles: [TestUserRole.ADMIN, TestUserRole.USER] },
  } as TestUser,
  
  unverified: {
    sub: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'unverified@test.com',
    preferred_username: 'unverified',
    name: 'Unverified User',
    email_verified: false,
    realm_access: { roles: [TestUserRole.USER] },
  } as TestUser,
};

/**
 * Generate a mock JWT token for testing
 * @param user - Test user data
 * @param options - Additional JWT options
 * @returns Signed JWT token string
 */
export function generateTestToken(
  user: TestUser,
  options: {
    expiresIn?: string | number;
    expired?: boolean;
    invalidSignature?: boolean;
  } = {}
): string {
  const payload = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: options.expired
      ? Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      : Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    iss: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    aud: 'account',
  };

  const secret = options.invalidSignature ? 'wrong-secret' : TEST_JWT_SECRET;
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

/**
 * Generate Authorization header value
 * @param token - JWT token
 * @returns Bearer token string for Authorization header
 */
export function authHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Create a mock requireAuth middleware for unit tests
 * This bypasses actual JWT verification and injects user data
 */
export function createMockAuthMiddleware(user: TestUser | null = testUsers.user1) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!user) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    req.user = user;
    req.userId = user.sub;
    next();
  };
}

/**
 * Mock the keycloak module for testing
 * Call this in beforeEach to set up auth mocking
 */
export function mockKeycloakAuth(user: TestUser | null = testUsers.user1) {
  jest.mock('../../src/auth/keycloak', () => ({
    requireAuth: createMockAuthMiddleware(user),
  }));
}

/**
 * Create mock request object with authentication
 */
export function createAuthenticatedRequest(user: TestUser = testUsers.user1): Partial<Request> {
  return {
    user,
    userId: user.sub,
    headers: {
      authorization: authHeader(generateTestToken(user)),
    },
  };
}

/**
 * Verify a user has specific roles
 */
export function hasRole(user: TestUser, role: TestUserRole): boolean {
  return user.realm_access?.roles.includes(role) ?? false;
}

/**
 * Create a random test user ID (UUID)
 */
export function randomUserId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
