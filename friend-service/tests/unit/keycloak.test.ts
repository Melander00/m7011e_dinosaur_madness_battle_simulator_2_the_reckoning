/**
 * Unit Tests for Keycloak Authentication Middleware
 */

import { describe, test, expect, jest, beforeEach, it } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Setup mocks before importing module
const mockGetSigningKey = jest.fn<any>();
const mockVerify = jest.fn<any>();

jest.mock('jwks-rsa', () => {
  return jest.fn().mockReturnValue({
    getSigningKey: mockGetSigningKey,
  });
});

jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
}));

// Now import the module under test
import { requireAuth } from '../../src/auth/keycloak';

describe('Keycloak Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock<any>;
  let mockStatus: jest.Mock<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn<any>().mockReturnThis();
    mockStatus = jest.fn<any>().mockReturnValue({ json: mockJson });
    
    mockReq = {
      headers: {},
    };
    
    mockRes = {
      status: mockStatus as any,
      json: mockJson as any,
    };
    
    mockNext = jest.fn<any>();

    // Default mock for getSigningKey
    mockGetSigningKey.mockImplementation((kid: any, callback: any) => {
      callback(null, { getPublicKey: () => 'test-public-key' });
    });
  });

  describe('requireAuth middleware', () => {
    describe('missing authorization header', () => {
      it('should return 401 when no authorization header is present', () => {
        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'No authorization header' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when authorization header is empty', () => {
        mockReq.headers = { authorization: '' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'No authorization header' });
      });
    });

    describe('invalid authorization header format', () => {
      it('should return 401 when authorization header has wrong format', () => {
        mockReq.headers = { authorization: 'InvalidFormat' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid authorization header' });
      });

      it('should return 401 when missing Bearer prefix', () => {
        mockReq.headers = { authorization: 'Basic sometoken' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid authorization header' });
      });

      it('should handle token being empty after Bearer', () => {
        // 'Bearer ' splits to ['Bearer', ''], second part is empty
        mockReq.headers = { authorization: 'Bearer ' };

        // The code will try to verify an empty token
        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(new Error('jwt malformed'), null);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockVerify).toHaveBeenCalled();
      });

      it('should accept case-insensitive Bearer prefix', () => {
        mockReq.headers = { authorization: 'bearer validtoken123' };

        // Setup mock to call the callback with decoded token
        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, { sub: 'user-id' });
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockVerify).toHaveBeenCalled();
      });
    });

    describe('token verification', () => {
      beforeEach(() => {
        mockReq.headers = { authorization: 'Bearer validtoken123' };
      });

      it('should call jwt.verify with correct parameters', () => {
        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, { sub: 'user-id' });
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockVerify).toHaveBeenCalledWith(
          'validtoken123',
          expect.any(Function),
          expect.objectContaining({
            algorithms: ['RS256'],
            audience: 'account',
          }),
          expect.any(Function)
        );
      });

      it('should return 401 when token is expired', () => {
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';

        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(expiredError, null);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Token has expired' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 401 when token is invalid', () => {
        const invalidError = new Error('invalid signature');
        invalidError.name = 'JsonWebTokenError';

        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(invalidError, null);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token: invalid signature' });
      });

      it('should return 401 when verification fails generically', () => {
        const genericError = new Error('verification failed');

        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(genericError, null);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid token: verification failed' });
      });
    });

    describe('successful authentication', () => {
      beforeEach(() => {
        mockReq.headers = { authorization: 'Bearer validtoken123' };
      });

      it('should set req.user with decoded token payload', () => {
        const mockPayload = {
          sub: '11111111-1111-1111-1111-111111111111',
          email: 'test@example.com',
          preferred_username: 'testuser',
          realm_access: { roles: ['user'] },
        };

        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, mockPayload);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual(mockPayload);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should set req.userId to the sub claim', () => {
        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, { sub: '22222222-2222-2222-2222-222222222222' });
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.userId).toBe('22222222-2222-2222-2222-222222222222');
      });

      it('should call next() on successful verification', () => {
        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, { sub: 'user-id' });
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should preserve all JWT claims in req.user', () => {
        const fullPayload = {
          sub: 'user-uuid',
          email: 'user@example.com',
          email_verified: true,
          preferred_username: 'username',
          name: 'Full Name',
          realm_access: { roles: ['user', 'admin'] },
          aud: 'account',
          iss: 'https://keycloak.test/realms/test',
          iat: 1234567890,
          exp: 1234571490,
        };

        mockVerify.mockImplementation((token: any, keyFn: any, options: any, callback: any) => {
          callback(null, fullPayload);
        });

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual(fullPayload);
        expect(mockReq.user?.email).toBe('user@example.com');
        expect(mockReq.user?.realm_access?.roles).toContain('admin');
      });
    });

    describe('edge cases', () => {
      it('should handle multiple spaces in authorization header', () => {
        mockReq.headers = { authorization: 'Bearer  token  with  spaces' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid authorization header' });
      });

      it('should handle Bearer with no token', () => {
        mockReq.headers = { authorization: 'Bearer' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
      });

      it('should handle token starting with space', () => {
        mockReq.headers = { authorization: 'Bearer  spacetoken' };

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
      });
    });
  });
});
