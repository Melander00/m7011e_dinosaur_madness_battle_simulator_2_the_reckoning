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
  username: string;
}

/**
 * GET /users
 * Get all users (with optional search)
 * Query params: ?search=username&limit=50
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = (req.query.search as string) || '';
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    let sql = 'SELECT "userID", username, created_at FROM "USER"';
    const params: any[] = [];

    if (search) {
      sql += ' WHERE username ILIKE $1';
      params.push(`%${search}%`);
      sql += ' ORDER BY username ASC LIMIT $2';
      params.push(limit);
    } else {
      sql += ' ORDER BY created_at DESC LIMIT $1';
      params.push(limit);
    }

    const { rows } = await query<User>(sql, params);

    return res.json({ users: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /users/:id
 * Get a specific user by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const { rows } = await query<User>(
      'SELECT "userID", username, created_at FROM "USER" WHERE "userID" = $1',
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
 * Body: { username: string } or { userID: number, username: string }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, userID } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required and must be a non-empty string' });
    }

    let sql: string;
    let params: any[];
    
    if (userID) {
      // Create user with specific ID
      const id = parseInt(userID, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'userID must be a valid integer' });
      }
      sql = 'INSERT INTO "USER" ("userID", username) VALUES ($1, $2) RETURNING "userID", username, created_at';
      params = [id, username.trim()];
    } else {
      // Auto-generate ID
      sql = 'INSERT INTO "USER" (username) VALUES ($1) RETURNING "userID", username, created_at';
      params = [username.trim()];
    }

    const { rows } = await query<User>(sql, params);

    return res.status(201).json({ 
      message: 'User created successfully',
      user: rows[0]
    });
  } catch (err: any) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Username or userID already exists' });
    }
    return next(err);
  }
});

/**
 * PUT /users/:id
 * Update a user's username
 * Body: { username: string }
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { username } = req.body || {};

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Username is required and must be a non-empty string' });
    }

    const result = await query<User>(
      'UPDATE "USER" SET username = $1 WHERE "userID" = $2 RETURNING "userID", username, created_at',
      [username.trim(), userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ 
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return next(err);
  }
});

/**
 * DELETE /users/:id
 * Delete a user (cascades to relationships and requests)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const result = await query<UserIdRow>(
      'DELETE FROM "USER" WHERE "userID" = $1 RETURNING "userID", username',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ 
      message: 'User deleted successfully (including all friendships and requests)',
      user: result.rows[0]
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
