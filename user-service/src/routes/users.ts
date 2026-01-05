import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';

const router = Router();

interface User {
  userId: string;
  quote: string | null;
  profilePicture: Buffer | null;
  profileBanner: Buffer | null;
}

/**
 * GET /users
 * Get all users (with optional limit)
 * Query params: ?limit=50
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    const { rows } = await query<User>(
      'SELECT userId, quote FROM users ORDER BY userId LIMIT $1',
      [limit]
    );

    return res.json({ users: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /users/:id
 * Get a specific user by UUID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const { rows } = await query<User>(
      'SELECT userId, quote FROM users WHERE userId = $1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /users
 * Create a new user
 * Body: { userId: string, quote?: string }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, quote } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { rows } = await query<User>(
      'INSERT INTO users (userId, quote) VALUES ($1, $2) RETURNING userId, quote',
      [userId, quote || null]
    );

    return res.status(201).json({ 
      message: 'User created successfully',
      user: rows[0]
    });
  } catch (err: any) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'User already exists' });
    }
    return next(err);
  }
});

/**
 * PUT /users/:id
 * Update a user's quote
 * Body: { quote: string }
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const { quote } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const result = await query<User>(
      'UPDATE users SET quote = $1 WHERE userId = $2 RETURNING userId, quote',
      [quote || null, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /users/:id
 * Delete a user (cascades to relationships and requests)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const result = await query<{ userId: string }>(
      'DELETE FROM users WHERE userId = $1 RETURNING userId',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ 
      message: 'User deleted successfully (including all relationships and requests)',
      userId: result.rows[0].userId
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
