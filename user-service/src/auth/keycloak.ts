import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * KEYCLOAK AUTHENTICATION MIDDLEWARE
 *
 * - Validates JWT tokens issued by Keycloak
 * - Attaches decoded token to req.user
 * - Provides optional DEV auth bypass
 */

// ─────────────────────────────────────────────
// Keycloak configuration
// ─────────────────────────────────────────────
const KEYCLOAK_URL =
  process.env.KEYCLOAK_URL || 'https://keycloak.ltu-m7011e-1.se';
const REALM = process.env.KEYCLOAK_REALM || 'myapp';

const JWKS_URI = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`;

// ─────────────────────────────────────────────
// JWKS client (public key fetching)
// ─────────────────────────────────────────────
const client = jwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error("Missing KID in JWT header"));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }

    if (!key) {
      callback(new Error("No signing key returned from JWKS"));
      return;
    }

    callback(null, key.getPublicKey());
  });
}


// ─────────────────────────────────────────────
// Express request augmentation
// ─────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
      userId?: string;
    }
  }
}

// ─────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  /**
   * DEV AUTH BYPASS
   * Used ONLY for local development & testing
   */
  if (process.env.DISABLE_AUTH === 'true') {
    const userId = process.env.DEV_USER_ID || "00000000-0000-0000-0000-000000000000";
    const username = process.env.DEV_USERNAME || "devuser";

    req.userId = userId;
    req.user = {
      sub: userId,
      preferred_username: username,
    } as jwt.JwtPayload;

    return next();
  }

  // ─────────────────────────────────────────
  // Real JWT authentication
  // ─────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
      audience: 'account',
      issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
    },
    (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }

        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = decoded as jwt.JwtPayload;
      req.userId = req.user.sub;

      next();
    }
  );
}
