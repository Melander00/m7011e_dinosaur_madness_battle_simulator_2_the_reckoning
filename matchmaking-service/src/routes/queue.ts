import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from "../auth/keycloak";
import { getUserElo } from '../services/leaderboard-client';
import { matchmakingService } from '../services/matchmaking-service';

const router = Router();

/**
 * POST /queue/join
 * Join the matchmaking queue
 * Requires valid JWT token
 */
router.post('/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId; // From Keycloak JWT
    const authToken = req.headers.authorization;
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!authToken) {
      return res.status(500).json({ error: 'Authorization token missing' });
    }

    // Fetch user's elo from leaderboard service
    const elo = await getUserElo(userId, authToken);

    // Add user to matchmaking queue
    await matchmakingService.addToQueue(userId, elo);

    return res.status(200).json({
      message: 'Successfully joined matchmaking queue',
      userId,
      elo,
      queuePosition: await matchmakingService.getQueuePosition(userId)
    });
  } catch (err: any) {
    console.error('Error joining queue:', err);
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
    const elo = await getUserElo(req.userId!, "")
    res.json({elo})
})

/**
 * POST /queue/leave
 * Leave the matchmaking queue
 * Requires valid JWT token
 */
router.post('/leave', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId; // From Keycloak JWT
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    await matchmakingService.removeFromQueue(userId);

    return res.status(200).json({
      message: 'Successfully left matchmaking queue',
      userId
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /queue/statusauthenticated user
 * Requires valid JWT token
 */
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId; // From Keycloak JWT
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const position = await matchmakingService.getQueuePosition(userId);
    
    if (position === null) {
      return res.status(404).json({ 
        error: 'User not in queue',
        inQueue: false 
      });
    }

    return res.json({
      inQueue: true,
      queuePosition: position,
      userId
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /queue/stats
 * Requires valid JWT token
 */
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await matchmakingService.getQueueStats();

    return res.json({
      totalPlayersInQueue: stats.totalPlayers,
      averageWaitTimeSeconds: Math.round(stats.averageWaitTime)
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
