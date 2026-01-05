/**
 * Unit Tests for Auth Test Helpers
 * Tests the authentication helper functions used in other tests
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import {
  generateTestToken,
  authHeader,
  testUsers,
  TestUserRole,
  hasRole,
  randomUserId,
  TEST_JWT_SECRET,
  createMockAuthMiddleware,
} from '../setup/auth.helpers';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

describe('Auth Test Helpers', () => {
  describe('testUsers', () => {
    it('should have predefined test users', () => {
      expect(testUsers.user1).toBeDefined();
      expect(testUsers.user2).toBeDefined();
      expect(testUsers.user3).toBeDefined();
      expect(testUsers.admin).toBeDefined();
      expect(testUsers.unverified).toBeDefined();
    });

    it('should have unique user IDs', () => {
      const userIds = Object.values(testUsers).map(u => u.sub);
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(userIds.length);
    });

    it('should have valid UUID format for all user IDs', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      Object.values(testUsers).forEach(user => {
        expect(user.sub).toMatch(uuidRegex);
      });
    });

    it('admin user should have admin role', () => {
      expect(testUsers.admin.realm_access?.roles).toContain(TestUserRole.ADMIN);
    });

    it('unverified user should have email_verified as false', () => {
      expect(testUsers.unverified.email_verified).toBe(false);
    });
  });

  describe('generateTestToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateTestToken(testUsers.user1);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should encode user data in token', () => {
      const token = generateTestToken(testUsers.user1);
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;

      expect(decoded.sub).toBe(testUsers.user1.sub);
      expect(decoded.email).toBe(testUsers.user1.email);
      expect(decoded.preferred_username).toBe(testUsers.user1.preferred_username);
    });

    it('should set default expiration to 1 hour', () => {
      const token = generateTestToken(testUsers.user1);
      const decoded = jwt.decode(token) as any;

      const now = Math.floor(Date.now() / 1000);
      const oneHour = 3600;
      
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + oneHour + 5); // 5 second tolerance
    });

    it('should generate expired token when expired option is true', () => {
      const token = generateTestToken(testUsers.user1, { expired: true });
      const decoded = jwt.decode(token) as any;

      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeLessThan(now);
    });

    it('should include issuer and audience claims', () => {
      const token = generateTestToken(testUsers.user1);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iss).toContain('keycloak');
      expect(decoded.aud).toBe('account');
    });
  });

  describe('authHeader', () => {
    it('should create Bearer token string', () => {
      const token = 'test-token-123';
      const header = authHeader(token);

      expect(header).toBe('Bearer test-token-123');
    });

    it('should work with generated tokens', () => {
      const token = generateTestToken(testUsers.user1);
      const header = authHeader(token);

      expect(header).toMatch(/^Bearer .+$/);
    });
  });

  describe('createMockAuthMiddleware', () => {
    it('should create middleware that sets user on request', () => {
      const middleware = createMockAuthMiddleware(testUsers.user1);
      const mockReq: Partial<Request> = {};
      const mockRes: Partial<Response> = {};
      const mockNext = jest.fn<any>();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockReq.user).toEqual(testUsers.user1);
      expect(mockReq.userId).toBe(testUsers.user1.sub);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when user is null', () => {
      const middleware = createMockAuthMiddleware(null);
      const mockReq: Partial<Request> = {};
      const mockJson = jest.fn<any>();
      const mockStatus = jest.fn<any>().mockReturnValue({ json: mockJson });
      const mockRes: Partial<Response> = {
        status: mockStatus as any,
        json: mockJson as any,
      };
      const mockNext = jest.fn<any>();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'No authorization header' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use default user1 when no user provided', () => {
      const middleware = createMockAuthMiddleware();
      const mockReq: Partial<Request> = {};
      const mockRes: Partial<Response> = {};
      const mockNext = jest.fn<any>();

      middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockReq.userId).toBe(testUsers.user1.sub);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      expect(hasRole(testUsers.admin, TestUserRole.ADMIN)).toBe(true);
      expect(hasRole(testUsers.user1, TestUserRole.USER)).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      expect(hasRole(testUsers.user1, TestUserRole.ADMIN)).toBe(false);
      expect(hasRole(testUsers.user2, TestUserRole.MODERATOR)).toBe(false);
    });

    it('should handle users with no roles', () => {
      const noRolesUser = { ...testUsers.user1, realm_access: undefined };
      expect(hasRole(noRolesUser as any, TestUserRole.USER)).toBe(false);
    });
  });

  describe('randomUserId', () => {
    it('should generate a valid UUID', () => {
      const userId = randomUserId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(userId).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = Array.from({ length: 100 }, () => randomUserId());
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(100);
    });

    it('should be version 4 UUID', () => {
      const userId = randomUserId();
      // Version 4 UUIDs have '4' as the 13th character
      expect(userId.charAt(14)).toBe('4');
    });
  });

  describe('TestUserRole enum', () => {
    it('should have expected roles', () => {
      expect(TestUserRole.USER).toBe('user');
      expect(TestUserRole.ADMIN).toBe('admin');
      expect(TestUserRole.MODERATOR).toBe('moderator');
    });
  });
});
