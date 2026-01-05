import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { requireAuth } from "../auth/keycloak";

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
  try {
    const userId = req.userId;
    
    if (!userId) {
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

    return res.json({ userId, friends: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /friendships/count
 * Get friend count for authenticated user
 * Requires valid JWT token
 */
router.get('/count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const { rows } = await query<CountRow>(
      `SELECT COUNT(*) as count 
       FROM relationships 
       WHERE userId1 = $1 OR userId2 = $1`,
      [userId]
    );

    return res.json({ userId, friendCount: parseInt(rows[0].count, 10) });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /friendships/:userId
 * Get all friends for a specific user (public)
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
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

    return res.json({ userId, friends: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /friendships
 * Create a new friendship between authenticated user and another user
 * Body: { userId: string }
 * Requires valid JWT token
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId1 = req.userId; // authenticated user
    const { userId: userId2 } = req.body || {};

    if (!userId1) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!userId2) {
      return res.status(400).json({ error: 'userId is required in body' });
    }

    if (userId1 === userId2) {
      return res.status(400).json({ error: 'Cannot create friendship with self' });
    }

    // Check if both users exist
    const { rows: users } = await query<{ userId: string }>(
      `SELECT userId FROM users WHERE userId IN ($1, $2)`,
      [userId1, userId2]
    );

    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both users do not exist' });
    }

    // Insert friendship
    await query(
      `INSERT INTO relationships (userId1, userId2) 
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId1, userId2]
    );

    return res.status(201).json({ 
      message: 'Friendship created successfully',
      friendship: { userId1, userId2 }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /friendships/:userId
 * Remove a friendship between authenticated user and another user
 * Requires valid JWT token
 */
router.delete('/:userId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId1 = req.userId; // authenticated user
    const userId2 = req.params.userId;

    if (!userId1) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!userId2) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Delete friendship (try both orderings since we don't know the order)
    const result = await query(
      `DELETE FROM relationships 
       WHERE (userId1 = $1 AND userId2 = $2) OR (userId1 = $2 AND userId2 = $1)`,
      [userId1, userId2]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    return res.json({ 
      message: 'Friendship deleted successfully',
      deleted: { userId1, userId2 }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
