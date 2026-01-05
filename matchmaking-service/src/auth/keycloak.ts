import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

/**
 * KEYCLOAK AUTHENTICATION MIDDLEWARE
 * 
 * HOW TO USE IN YOUR SERVICE:
 * 
 * 1. Import this middleware:
 *    import { requireAuth } from './auth/keycloak';
 * 
 * 2. Add to protected routes:
 *    app.get('/api/my-endpoint', requireAuth, (req, res) => {
 *        // req.user contains JWT payload with userId, email, roles
 *        const userId = req.user?.sub;  // Keycloak user ID
 *        res.json({ userId });
 *    });
 * 
 * 3. That's it! The middleware:
 *    - Validates JWT token from Authorization header
 *    - Returns 401 if no token or invalid token
 *    - Attaches user info to req.user if valid
 */

// Keycloak configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://keycloak.ltu-m7011e-1.se';
const REALM = process.env.KEYCLOAK_REALM || 'myapp';
const JWKS_URI = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`;

// Create JWKS client to fetch public keys from Keycloak
const client = jwksClient({
    jwksUri: JWKS_URI,
    cache: true,
    cacheMaxAge: 600000, // Cache keys for 10 minutes
});

// Helper function to get signing key
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

// Extend Express Request type to include user payload
declare global {
    namespace Express {
        interface Request {
            user?: jwt.JwtPayload;
            userId?: string; // Convenience accessor for req.user.sub
        }
    }
}

/**
 * Middleware to require valid JWT token from Keycloak
 * Use this in ANY backend service to protect routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        res.status(401).json({ error: 'No authorization header' });
        return;
    }

    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        res.status(401).json({ error: 'Invalid authorization header' });
        return;
    }

    const token = parts[1];

    // Verify token signature and claims
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
                    res.status(401).json({ error: 'Token has expired' });
                    return;
                }
                res.status(401).json({ error: `Invalid token: ${err.message}` });
                return;
            }

            // Add user info to request object
            req.user = decoded as jwt.JwtPayload;
            req.userId = req.user.sub; // Convenience accessor for Keycloak user ID
            next();
        }
    );
}