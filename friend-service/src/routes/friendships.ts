import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';

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
 * GET /friendships/:userId
 * Get all friends for a specific user
 * Returns userIds of all friends
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
 * Create a new friendship between two users
 * Body: { userId1: string, userId2: string }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { userId1, userId2 } = req.body || {};

    if (!userId1 || !userId2) {
      return res.status(400).json({ error: 'Both userId1 and userId2 are required' });
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
 * DELETE /friendships
 * Remove a friendship between two users
 * Body: { userId1: string, userId2: string }
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId1, userId2 } = req.body || {};

    if (!userId1 || !userId2) {
      return res.status(400).json({ error: 'Both userId1 and userId2 are required' });
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

/**
 * GET /friendships/:userId/count
 * Get friend count for a user
 */
router.get('/:userId/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Valid userId is required' });
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

export default router;
