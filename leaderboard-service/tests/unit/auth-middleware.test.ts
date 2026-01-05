/**
 * Basic Auth Middleware Tests
 * Just enough to push coverage over 60%
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock jwks-rsa before importing
jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: jest.fn((kid: string, callback: any) => {
      callback(null, { getPublicKey: () => 'mock-key' });
    })
  }))
}));

// Mock jsonwebtoken
const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
  decode: jest.fn(),
}));

import { requireAuth } from '../../src/auth/keycloak';

describe('Auth Middleware - Basic Coverage', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  test('AUTH 1: should reject request without Authorization header', () => {
    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('AUTH 2: should reject malformed Authorization header', () => {
    mockReq.headers = { authorization: 'InvalidFormat' };

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('AUTH 3: should call next() with valid token', () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      preferred_username: 'testuser'
    };

    mockVerify.mockImplementation((_token: any, _key: any, _opts: any, callback: any) => {
      callback(null, mockPayload);
    });

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  test('AUTH 4: should reject expired token', () => {
    mockReq.headers = { authorization: 'Bearer expired-token' };

    mockVerify.mockImplementation((_token: any, _key: any, _opts: any, callback: any) => {
      const error = new Error('jwt expired') as any;
      error.name = 'TokenExpiredError';
      callback(error);
    });

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('AUTH 5: should reject invalid token', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };

    mockVerify.mockImplementation((_token: any, _key: any, _opts: any, callback: any) => {
      callback(new Error('invalid signature'));
    });

    requireAuth(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
