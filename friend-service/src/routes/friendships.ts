import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../../shared/db';

const router = Router();

interface User {
  userID: number;
  username: string;
  created_at: Date;
}

interface UserIdRow {
  userID: number;
}

interface CountRow {
  count: string;
}

/**
 * GET /friendships/:userId
 * Get all friends for a specific user
 * Returns user details of all friends (searches both userID1 and userID2)
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    // Find all friendships where userId matches either userID1 or userID2
    const { rows } = await query<User>(
      `SELECT 
        u."userID",
        u.username,
        u.created_at
      FROM "USER_RELATIONSHIP" ur
      JOIN "USER" u ON (
        CASE 
          WHEN ur."userID1" = $1 THEN u."userID" = ur."userID2"
          WHEN ur."userID2" = $1 THEN u."userID" = ur."userID1"
        END
      )
      WHERE ur."userID1" = $1 OR ur."userID2" = $1
      ORDER BY u.username ASC`,
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
 * Body: { userID1: number, userID2: number }
 * Note: Automatically orders IDs so userID1 < userID2
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { userID1, userID2 } = req.body || {};
    
    userID1 = parseInt(userID1, 10);
    userID2 = parseInt(userID2, 10);

    if (!userID1 || !userID2 || isNaN(userID1) || isNaN(userID2)) {
      return res.status(400).json({ error: 'Both userID1 and userID2 are required as integers' });
    }

    if (userID1 === userID2) {
      return res.status(400).json({ error: 'Cannot create friendship with self' });
    }

    // Ensure userID1 < userID2 for consistency (as per CHECK constraint)
    if (userID1 > userID2) {
      [userID1, userID2] = [userID2, userID1];
    }

    // Check if both users exist
    const { rows: users } = await query<UserIdRow>(
      `SELECT "userID" FROM "USER" WHERE "userID" IN ($1, $2)`,
      [userID1, userID2]
    );

    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both users do not exist' });
    }

    // Insert friendship
    await query(
      `INSERT INTO "USER_RELATIONSHIP" ("userID1", "userID2") 
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userID1, userID2]
    );

    return res.status(201).json({ 
      message: 'Friendship created successfully',
      friendship: { userID1, userID2 }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /friendships
 * Remove a friendship between two users
 * Body: { userID1: number, userID2: number }
 */
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { userID1, userID2 } = req.body || {};
    
    userID1 = parseInt(userID1, 10);
    userID2 = parseInt(userID2, 10);

    if (!userID1 || !userID2 || isNaN(userID1) || isNaN(userID2)) {
      return res.status(400).json({ error: 'Both userID1 and userID2 are required' });
    }

    // Ensure proper ordering
    if (userID1 > userID2) {
      [userID1, userID2] = [userID2, userID1];
    }

    const result = await query(
      `DELETE FROM "USER_RELATIONSHIP" 
       WHERE "userID1" = $1 AND "userID2" = $2`,
      [userID1, userID2]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    return res.json({ 
      message: 'Friendship deleted successfully',
      deleted: { userID1, userID2 }
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
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const { rows } = await query<CountRow>(
      `SELECT COUNT(*) as count 
       FROM "USER_RELATIONSHIP" 
       WHERE "userID1" = $1 OR "userID2" = $1`,
      [userId]
    );

    return res.json({ userId, friendCount: parseInt(rows[0].count, 10) });
  } catch (err) {
    return next(err);
  }
});

export default router;
