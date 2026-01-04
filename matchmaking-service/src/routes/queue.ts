import { Router, Request, Response, NextFunction } from 'express';
import { matchmakingService } from '../services/matchmaking-service';
import { getUserElo } from '../services/leaderboard-client';

const router = Router();

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * POST /queue/join
 * Join the matchmaking queue
 * Requires authentication token in Authorization header
 */
router.post('/join', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authToken = req.headers.authorization;
    
    if (!authToken) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    // Extract userId from your auth system (e.g., Keycloak JWT)
    // For now, expecting userId in request body or from decoded token
    const userId = req.body.userId || req.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
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

/**
 * POST /queue/leave
 * Leave the matchmaking queue
 */
router.post('/leave', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.userId || req.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
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
 * GET /queue/status
 * Get current queue status for the user
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string || req.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
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
 * Get overall queue statistics
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
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
