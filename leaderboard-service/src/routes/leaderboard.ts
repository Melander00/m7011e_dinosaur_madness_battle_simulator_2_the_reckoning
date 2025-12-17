import express from 'express';
import { requireAuth } from '../../../shared/auth/keycloak';
import * as rankRepo from '../repositories/rankRepository';

const router = express.Router();

/**
 * GET /leaderboard/top?limit=10
 * Get top N players ordered by rankedPoints DESC
 * Default limit: 10, Max limit: 100
 * Public endpoint (no auth required)
 */
router.get('/top', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }
    
    const rows = await rankRepo.getTop(limit);
    
    return res.json({
      leaderboard: rows.map(r => ({
        rank: r.rank,
        userId: r.userid,
        rankedPoints: r.rankedpoints
      })),
      count: rows.length
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /leaderboard/me
 * Get authenticated user's rank and points
 * Requires valid JWT token
 * Returns 404 if user not found in ranks table
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId; // Keycloak sub from JWT
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }
    
    const result = await rankRepo.getMe(userId);
    
    if (!result) {
      return res.status(404).json({ 
        error: 'User not found in leaderboard',
        userId 
      });
    }
    
    return res.json({
      userId: result.userid,
      rank: result.rank,
      rankedPoints: result.rankedpoints
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /leaderboard/nearby?range=5
 * Get players near the authenticated user's rank
 * Default range: 5 (5 above and 5 below), Max range: 50
 * Requires valid JWT token
 * Returns players ranked near the user for better context
 */
router.get('/nearby', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId; // Keycloak sub from JWT
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }
    
    const range = parseInt(req.query.range as string, 10) || 5;
    
    if (isNaN(range) || range < 1) {
      return res.status(400).json({ error: 'Invalid range parameter' });
    }
    
    const rows = await rankRepo.getNearby(userId, range);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found in leaderboard',
        userId 
      });
    }
    
    return res.json({
      nearby: rows.map(r => ({
        rank: r.rank,
        userId: r.userid,
        rankedPoints: r.rankedpoints,
        isCurrentUser: r.userid === userId
      })),
      count: rows.length
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
