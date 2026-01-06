/// <reference types="jest" />

// Extend Jest matchers with custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Check if a string is a valid UUID
       */
      toBeUUID(): R;
    }
  }
}

// Extend Express Request for auth
declare global {
  namespace Express {
    interface Request {
      user?: import('jsonwebtoken').JwtPayload;
      userId?: string;
    }
  }
}

export {};