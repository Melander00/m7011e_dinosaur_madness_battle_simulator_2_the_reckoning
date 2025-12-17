const { NextFunction, Request, Response } = require('express');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

/**
 * KEYCLOAK AUTHENTICATION MIDDLEWARE
 * 
 * HOW TO USE IN YOUR SERVICE:
 * 
 * 1. Import this middleware:
 *    import { requireAuth } from '../../../shared/auth/keycloak';
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
 * 
 * EXAMPLE SERVICES:
 * - leaderboard-service: /elo/:userId (protected)
 * - profile-service: /api/profile/:userId (should be protected)
 * - friend-service: /api/friends (should be protected)
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
function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}

/**
 * Middleware to require valid JWT token from Keycloak
 * Use this in ANY backend service to protect routes
 * 
 * Example:
 *   import { requireAuth } from '../../../shared/middleware/keycloak-auth';
 *   app.get('/protected', requireAuth, (req, res) => { ... });
 */
// function requireAuth(req, res, next) {
//     // Get token from Authorization header
//     const authHeader = req.headers.authorization;
    
//     if (!authHeader) {
//         res.status(401).json({ error: 'No authorization header' });
//         return;
//     }

//     // Extract token (format: "Bearer <token>")
//     const parts = authHeader.split(' ');
//     if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
//         res.status(401).json({ error: 'Invalid authorization header' });
//         return;
//     }

//     const token = parts[1];

//     // Verify token signature and claims
//     jwt.verify(
//         token,
//         getKey,
//         {
//             algorithms: ['RS256'],
//             audience: 'account',
//             issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
//         },
//         (err, decoded) => {
//             if (err) {
//                 if (err.name === 'TokenExpiredError') {
//                     res.status(401).json({ error: 'Token has expired' });
//                     return;
//                 }
//                 res.status(401).json({ error: `Invalid token: ${err.message}` });
//                 return;
//             }

//             // Add user info to request object
//             req.user = decoded;
//             next();
//         }
//     );
// }

function verifyJwt(token) {
    return new Promise((resolve, reject) => {
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
                        reject(new Error("Token has expired"))
                        return;
                    }
                    reject(new Error("Invalid token"))
                    return;
                }

                resolve(decoded)
            }
        );
    })
}

module.exports = {
    verifyJwt
}