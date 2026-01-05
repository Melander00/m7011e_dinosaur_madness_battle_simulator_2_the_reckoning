import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth } from "../auth/keycloak";
import { createRequestDuration, incRequestCount, PromProps } from '../monitoring/prometheus';
import { getUserElo } from '../services/leaderboard-client';
import { matchmakingService } from '../services/matchmaking-service';

const router = Router();

/**
 * POST /queue/join
 * Join the matchmaking queue
 * Requires valid JWT token
 */
router.post('/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const props: PromProps = {
    method: "POST",
    endpoint: "/queue/join"
  }

  const dur = createRequestDuration(props)

  try {
    const userId = req.userId; // From Keycloak JWT
    const authToken = req.headers.authorization;
    
    if (!userId) {
        
      incRequestCount(500, props)
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!authToken) {
      incRequestCount(500, props)
      return res.status(500).json({ error: 'Authorization token missing' });
    }

    // Fetch user's elo from leaderboard service
    const elo = await getUserElo(userId, authToken);

    // Add user to matchmaking queue
    await matchmakingService.addToQueue(userId, elo);

    incRequestCount(200, props)
    dur.end()

    return res.status(200).json({
      message: 'Successfully joined matchmaking queue',
      userId,
      elo,
      queuePosition: await matchmakingService.getQueuePosition(userId)
    });
  } catch (err: any) {
    console.error('Error joining queue:', err);
    incRequestCount(500, props)
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
  const props: PromProps = {
    method: "POST",
    endpoint: "/queue/leave"
  }

  const dur = createRequestDuration(props)
  try {
    const userId = req.userId; // From Keycloak JWT
    
    if (!userId) {
      incRequestCount(500, props)
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    await matchmakingService.removeFromQueue(userId);

    incRequestCount(200, props)
    dur.end()
    return res.status(200).json({
      message: 'Successfully left matchmaking queue',
      userId
    });
  } catch (err) {
    incRequestCount(500, props)
    return next(err);
  }
});

/**
 * GET /queue/statusauthenticated user
 * Requires valid JWT token
 */
router.get('/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const props: PromProps = {
    method: "GET",
    endpoint: "/queue/status"
  }

  const dur = createRequestDuration(props)
  try {
    const userId = req.userId; // From Keycloak JWT
    
    if (!userId) {
      incRequestCount(500, props)
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const position = await matchmakingService.getQueuePosition(userId);
    
    if (position === null) {
      incRequestCount(404, props)
      return res.status(404).json({ 
        error: 'User not in queue',
        inQueue: false 
      });
    }
    incRequestCount(200, props)
    dur.end()
    return res.json({
      inQueue: true,
      queuePosition: position,
      userId
    });
  } catch (err) {
    incRequestCount(500, props)
    return next(err);
  }
});

/**
 * GET /queue/stats
 * Requires valid JWT token
 */
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const props: PromProps = {
    method: "GET",
    endpoint: "/queue/stats"
  }

  const dur = createRequestDuration(props)
  try {
    const stats = await matchmakingService.getQueueStats();

    incRequestCount(200, props)
    dur.end()
    return res.json({
      totalPlayersInQueue: stats.totalPlayers,
      averageWaitTimeSeconds: Math.round(stats.averageWaitTime)
    });
  } catch (err) {
    incRequestCount(500, props)
    return next(err);
  }
});

export default router;
