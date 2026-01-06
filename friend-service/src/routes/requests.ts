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

interface IncomingRequest {
  fromUserId: string;
  status: number;
}

interface OutgoingRequest {
  toUserId: string;
  status: number;
}

interface RequestRow {
  fromUserId: string;
  toUserId: string;
  status: number;
}

/**
 * GET /requests/incoming
 * Get all incoming friend requests for authenticated user
 * Requires valid JWT token
 */
router.get('/incoming', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const { rows } = await query<IncomingRequest>(
      `SELECT 
        rr.fromUserId,
        rr.status
      FROM relationshipRequests rr
      WHERE rr.toUserId = $1 AND rr.status = $2`,
      [userId, RequestStatus.PENDING]
    );

    return res.json({ userId, requests: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /requests/outgoing
 * Get all outgoing friend requests from authenticated user
 * Requires valid JWT token
 */
router.get('/outgoing', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    const { rows } = await query<OutgoingRequest>(
      `SELECT 
        rr.toUserId,
        rr.status
      FROM relationshipRequests rr
      WHERE rr.fromUserId = $1`,
      [userId]
    );

    return res.json({ userId, requests: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /requests
 * Create a new friend request from authenticated user
 * Body: { toUserId: string }
 * Requires valid JWT token
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromUserId = req.userId;
    const { toUserId } = req.body || {};

    if (!fromUserId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!toUserId) {
      return res.status(400).json({ error: 'toUserId is required' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if both users exist
    const { rows: users } = await query<{ userId: string }>(
      `SELECT userId FROM users WHERE userId IN ($1, $2)`,
      [fromUserId, toUserId]
    );

    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both users do not exist' });
    }

    // Check if already friends
    const { rows: existing } = await query(
      `SELECT 1 FROM relationships 
       WHERE (userId1 = $1 AND userId2 = $2) OR (userId1 = $2 AND userId2 = $1)`,
      [fromUserId, toUserId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Users are already friends' });
    }

    // Check for existing pending request
    const { rows: pendingRequests } = await query(
      `SELECT 1 FROM relationshipRequests 
       WHERE fromUserId = $1 AND toUserId = $2 AND status = $3`,
      [fromUserId, toUserId, RequestStatus.PENDING]
    );

    if (pendingRequests.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create request
    const { rows } = await query<RequestRow>(
      `INSERT INTO relationshipRequests (fromUserId, toUserId, status)
       VALUES ($1, $2, $3)
       RETURNING fromUserId, toUserId, status`,
      [fromUserId, toUserId, RequestStatus.PENDING]
    );

    return res.status(201).json({ 
      message: 'Friend request sent successfully',
      request: rows[0]
    });
  } catch (err: any) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    return next(err);
  }
});

/**
 * PUT /requests/:fromUserId/accept
 * Accept a friend request and create friendship
 * Requires valid JWT token
 */
router.put('/:fromUserId/accept', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const toUserId = req.userId; // authenticated user is the recipient
    const fromUserId = req.params.fromUserId;
    
    if (!toUserId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!fromUserId) {
      return res.status(400).json({ error: 'fromUserId is required' });
    }

    // Get the request
    const { rows: requests } = await query<RequestRow>(
      `SELECT * FROM relationshipRequests 
       WHERE fromUserId = $1 AND toUserId = $2 AND status = $3`,
      [fromUserId, toUserId, RequestStatus.PENDING]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    // Create friendship
    await query(
      `INSERT INTO relationships (userId1, userId2)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [fromUserId, toUserId]
    );

    // Update request status
    await query(
      `UPDATE relationshipRequests 
       SET status = $1
       WHERE fromUserId = $2 AND toUserId = $3`,
      [RequestStatus.ACCEPTED, fromUserId, toUserId]
    );

    return res.json({ 
      message: 'Friend request accepted',
      friendship: { userId1: fromUserId, userId2: toUserId }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /requests/:fromUserId/reject
 * Reject a friend request
 * Requires valid JWT token
 */
router.put('/:fromUserId/reject', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const toUserId = req.userId; // authenticated user is the recipient
    const fromUserId = req.params.fromUserId;
    
    if (!toUserId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!fromUserId) {
      return res.status(400).json({ error: 'fromUserId is required' });
    }

    const result = await query(
      `UPDATE relationshipRequests 
       SET status = $1
       WHERE fromUserId = $2 AND toUserId = $3 AND status = $4`,
      [RequestStatus.REJECTED, fromUserId, toUserId, RequestStatus.PENDING]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    return res.json({ 
      message: 'Friend request rejected'
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /requests/:toUserId
 * Delete/cancel a friend request (authenticated user is sender)
 * Requires valid JWT token
 */
router.delete('/:toUserId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fromUserId = req.userId; // authenticated user is the sender
    const toUserId = req.params.toUserId;

    if (!fromUserId) {
      return res.status(500).json({ error: 'User ID not found in token' });
    }

    if (!toUserId) {
      return res.status(400).json({ error: 'toUserId is required' });
    }

    const result = await query(
      `DELETE FROM relationshipRequests 
       WHERE fromUserId = $1 AND toUserId = $2`,
      [fromUserId, toUserId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    return res.json({ 
      message: 'Friend request cancelled'
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
