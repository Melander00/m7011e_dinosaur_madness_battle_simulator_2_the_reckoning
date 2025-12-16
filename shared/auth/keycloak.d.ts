import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
declare global {
    namespace Express {
        interface Request {
            user?: jwt.JwtPayload;
            userId?: string;
        }
    }
}
/**
 * Middleware to require valid JWT token from Keycloak
 * Use this in ANY backend service to protect routes
 *
 * Example:
 *   import { requireAuth } from '../../../shared/middleware/keycloak-auth';
 *   app.get('/protected', requireAuth, (req, res) => { ... });
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=keycloak.d.ts.map