import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { requireAuth } from "../auth/keycloak";
import { gameInviteService } from '../services/game-invite-service';
import { createRequestDuration, incRequestCount } from '../monitoring/prometheus';

const router = Router();

// Status enum matching the database INTEGER values
const RequestStatus = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2
} as const;

interface FriendUser {
  userId: string;
}

interface CountRow {
  count: string;
}

/**
 * GET /friendships
 * Get all friends for authenticated user
 * Requires valid JWT token
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "GET", endpoint: "/friendships" });
  try {
    const userId = req.userId;
    
    if (!userId) {
      incRequestCount(500, { method: "GET", endpoint: "/friendships" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    // Find all friendships where userId matches either userId1 or userId2
    const { rows } = await query<FriendUser>(
      `SELECT 
        CASE 
          WHEN r.userId1 = $1 THEN r.userId2
          ELSE r.userId1
        END as "userId"
      FROM relationships r
      WHERE r.userId1 = $1 OR r.userId2 = $1`,
      [userId]
    );

    incRequestCount(200, { method: "GET", endpoint: "/friendships" });
    return res.json({ userId, friends: rows, count: rows.length });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/friendships" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * GET /friendships/invite
 * Get all incoming game invites for authenticated user
 * Requires valid JWT token
 */
router.get('/invite', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "GET", endpoint: "/friendships/invite" });
  try {
    const userId = req.userId;
    
    if (!userId) {
      incRequestCount(500, { method: "GET", endpoint: "/friendships/invite" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const invites = await gameInviteService.getReceivedInvites(userId);
    incRequestCount(200, { method: "GET", endpoint: "/friendships/invite" });
    return res.json({ userId, invites, count: invites.length });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/friendships/invite" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * GET /friendships/count
 * Get friend count for authenticated user
 * Requires valid JWT token
 */
router.get('/count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "GET", endpoint: "/friendships/count" });
  try {
    const userId = req.userId;
    
    if (!userId) {
      incRequestCount(500, { method: "GET", endpoint: "/friendships/count" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const { rows } = await query<CountRow>(
      `SELECT COUNT(*) as count 
       FROM relationships 
       WHERE userId1 = $1 OR userId2 = $1`,
      [userId]
    );

    incRequestCount(200, { method: "GET", endpoint: "/friendships/count" });
    return res.json({ userId, friendCount: parseInt(rows[0].count, 10) });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/friendships/count" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * GET /friendships/:userId
 * Get all friends for a specific user (public)
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "GET", endpoint: "/friendships/:userId" });
  try {
    const userId = req.params.userId;
    if (!userId) {
      incRequestCount(400, { method: "GET", endpoint: "/friendships/:userId" });
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    // Find all friendships where userId matches either userId1 or userId2
    const { rows } = await query<FriendUser>(
      `SELECT 
        CASE 
          WHEN r.userId1 = $1 THEN r.userId2
          ELSE r.userId1
        END as "userId"
      FROM relationships r
      WHERE r.userId1 = $1 OR r.userId2 = $1`,
      [userId]
    );

    incRequestCount(200, { method: "GET", endpoint: "/friendships/:userId" });
    return res.json({ userId, friends: rows, count: rows.length });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/friendships/:userId" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * POST /friendships/invite
 * Send a game invite to a friend
 * Body: { toUserId: string }
 * Requires valid JWT token
 */
router.post('/invite', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "POST", endpoint: "/friendships/invite" });
  try {
    const fromUserId = req.userId;
    const { toUserId } = req.body || {};

    if (!fromUserId) {
      incRequestCount(500, { method: "POST", endpoint: "/friendships/invite" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!toUserId) {
      incRequestCount(400, { method: "POST", endpoint: "/friendships/invite" });
      return res.status(400).json({ error: 'toUserId is required in body' });
    }

    if (fromUserId === toUserId) {
      incRequestCount(400, { method: "POST", endpoint: "/friendships/invite" });
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    // Check if toUserId is a friend
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM relationships 
       WHERE (userId1 = $1 AND userId2 = $2) OR (userId1 = $2 AND userId2 = $1)`,
      [fromUserId, toUserId]
    );

    if (parseInt(rows[0].count, 10) === 0) {
      incRequestCount(400, { method: "POST", endpoint: "/friendships/invite" });
      return res.status(400).json({ error: 'You can only invite friends to play' });
    }

    const invite = await gameInviteService.sendInvite(fromUserId, toUserId);
    incRequestCount(201, { method: "POST", endpoint: "/friendships/invite" });
    return res.status(201).json({
      message: 'Game invite sent successfully',
      invite
    });
  } catch (err: any) {
    if (err.message?.includes('already have a pending invite')) {
      incRequestCount(409, { method: "POST", endpoint: "/friendships/invite" });
      return res.status(409).json({ error: err.message });
    }
    incRequestCount(500, { method: "POST", endpoint: "/friendships/invite" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * DELETE /friendships/invite/:inviteId
 * Cancel a sent game invite
 * Requires valid JWT token
 */
router.delete('/invite/:inviteId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
  try {
    const userId = req.userId;
    const { inviteId } = req.params;

    if (!userId) {
      incRequestCount(500, { method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const cancelled = await gameInviteService.cancelInvite(inviteId, userId);
    if (!cancelled) {
      incRequestCount(404, { method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
      return res.status(404).json({ error: 'Invite not found or already expired' });
    }

    incRequestCount(200, { method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
    return res.json({ message: 'Game invite cancelled successfully' });
  } catch (err: any) {
    if (err.message?.includes('can only cancel your own')) {
      incRequestCount(403, { method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
      return res.status(403).json({ error: err.message });
    }
    incRequestCount(500, { method: "DELETE", endpoint: "/friendships/invite/:inviteId" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * POST /friendships
 * Create a new friendship between authenticated user and another user
 * Body: { userId: string }
 * Requires valid JWT token
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "POST", endpoint: "/friendships" });
  try {
    const userId1 = req.userId; // authenticated user
    const { userId: userId2 } = req.body || {};

    if (!userId1) {
      incRequestCount(500, { method: "POST", endpoint: "/friendships" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!userId2) {
      incRequestCount(400, { method: "POST", endpoint: "/friendships" });
      return res.status(400).json({ error: 'userId is required in body' });
    }

    if (userId1 === userId2) {
      incRequestCount(400, { method: "POST", endpoint: "/friendships" });
      return res.status(400).json({ error: 'Cannot create friendship with self' });
    }

    // Check if both users exist
    const { rows: users } = await query<{ userId: string }>(
      `SELECT userId FROM users WHERE userId IN ($1, $2)`,
      [userId1, userId2]
    );

    if (users.length !== 2) {
      incRequestCount(404, { method: "POST", endpoint: "/friendships" });
      return res.status(404).json({ error: 'One or both users do not exist' });
    }

    // Insert friendship
    await query(
      `INSERT INTO relationships (userId1, userId2) 
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId1, userId2]
    );

    incRequestCount(201, { method: "POST", endpoint: "/friendships" });
    return res.status(201).json({ 
      message: 'Friendship created successfully',
      friendship: { userId1, userId2 }
    });
  } catch (err) {
    incRequestCount(500, { method: "POST", endpoint: "/friendships" });
    return next(err);
  } finally {
    timer.end();
  }
});

/**
 * DELETE /friendships/:userId
 * Remove a friendship between authenticated user and another user
 * Requires valid JWT token
 */
router.delete('/:userId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const timer = createRequestDuration({ method: "DELETE", endpoint: "/friendships/:userId" });
  try {
    const userId1 = req.userId; // authenticated user
    const userId2 = req.params.userId;

    if (!userId1) {
      incRequestCount(500, { method: "DELETE", endpoint: "/friendships/:userId" });
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!userId2) {
      incRequestCount(400, { method: "DELETE", endpoint: "/friendships/:userId" });
      return res.status(400).json({ error: 'userId is required' });
    }

    // Delete friendship (try both orderings since we don't know the order)
    const result = await query(
      `DELETE FROM relationships 
       WHERE (userId1 = $1 AND userId2 = $2) OR (userId1 = $2 AND userId2 = $1)`,
      [userId1, userId2]
    );

    if (result.rowCount === 0) {
      incRequestCount(404, { method: "DELETE", endpoint: "/friendships/:userId" });
      return res.status(404).json({ error: 'Friendship not found' });
    }

    incRequestCount(200, { method: "DELETE", endpoint: "/friendships/:userId" });
    return res.json({ 
      message: 'Friendship deleted successfully',
      deleted: { userId1, userId2 }
    });
  } catch (err) {
    incRequestCount(500, { method: "DELETE", endpoint: "/friendships/:userId" });
    return next(err);
  } finally {
    timer.end();
  }
});

export default router;
