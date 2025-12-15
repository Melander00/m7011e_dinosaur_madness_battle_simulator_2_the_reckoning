const express = require('express');
const { query } = require('../../../shared/db');

const router = express.Router();

/**
 * GET /requests/incoming/:userId
 * Get all incoming friend requests for a user
 */
router.get('/incoming/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const { rows } = await query(
      `SELECT 
        rr.id,
        rr."fromUserID",
        u.username as from_username,
        rr.status,
        rr.created_at
      FROM "RelationshipRequests" rr
      JOIN "USER" u ON u."userID" = rr."fromUserID"
      WHERE rr."toUserID" = $1 AND rr.status = 'pending'
      ORDER BY rr.created_at DESC`,
      [userId]
    );

    return res.json({ userId, requests: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /requests/outgoing/:userId
 * Get all outgoing friend requests from a user
 */
router.get('/outgoing/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const { rows } = await query(
      `SELECT 
        rr.id,
        rr."toUserID",
        u.username as to_username,
        rr.status,
        rr.created_at
      FROM "RelationshipRequests" rr
      JOIN "USER" u ON u."userID" = rr."toUserID"
      WHERE rr."fromUserID" = $1
      ORDER BY rr.created_at DESC`,
      [userId]
    );

    return res.json({ userId, requests: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /requests
 * Create a new friend request
 * Body: { fromUserID: number, toUserID: number }
 */
router.post('/', async (req, res, next) => {
  try {
    const { fromUserID, toUserID } = req.body || {};
    
    const fromId = parseInt(fromUserID, 10);
    const toId = parseInt(toUserID, 10);

    if (!fromId || !toId || isNaN(fromId) || isNaN(toId)) {
      return res.status(400).json({ error: 'Both fromUserID and toUserID are required as integers' });
    }

    if (fromId === toId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if both users exist
    const { rows: users } = await query(
      `SELECT "userID" FROM "USER" WHERE "userID" IN ($1, $2)`,
      [fromId, toId]
    );

    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both users do not exist' });
    }

    // Check if already friends
    const minId = Math.min(fromId, toId);
    const maxId = Math.max(fromId, toId);
    
    const { rows: existing } = await query(
      `SELECT 1 FROM "USER_RELATIONSHIP" 
       WHERE "userID1" = $1 AND "userID2" = $2`,
      [minId, maxId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Users are already friends' });
    }

    // Check for existing pending request
    const { rows: pendingRequests } = await query(
      `SELECT id FROM "RelationshipRequests" 
       WHERE "fromUserID" = $1 AND "toUserID" = $2 AND status = 'pending'`,
      [fromId, toId]
    );

    if (pendingRequests.length > 0) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create request
    const { rows } = await query(
      `INSERT INTO "RelationshipRequests" ("fromUserID", "toUserID", status)
       VALUES ($1, $2, 'pending')
       RETURNING id, "fromUserID", "toUserID", status, created_at`,
      [fromId, toId]
    );

    return res.status(201).json({ 
      message: 'Friend request sent successfully',
      request: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    return next(err);
  }
});

/**
 * PUT /requests/:id/accept
 * Accept a friend request and create friendship
 */
router.put('/:id/accept', async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ error: 'Valid request ID is required' });
    }

    // Get the request
    const { rows: requests } = await query(
      `SELECT * FROM "RelationshipRequests" WHERE id = $1 AND status = 'pending'`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    const request = requests[0];
    const userID1 = Math.min(request.fromUserID, request.toUserID);
    const userID2 = Math.max(request.fromUserID, request.toUserID);

    // Create friendship
    await query(
      `INSERT INTO "USER_RELATIONSHIP" ("userID1", "userID2")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userID1, userID2]
    );

    // Update request status
    await query(
      `UPDATE "RelationshipRequests" 
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1`,
      [requestId]
    );

    return res.json({ 
      message: 'Friend request accepted',
      friendship: { userID1, userID2 },
      requestId
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PUT /requests/:id/reject
 * Reject a friend request
 */
router.put('/:id/reject', async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ error: 'Valid request ID is required' });
    }

    const result = await query(
      `UPDATE "RelationshipRequests" 
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [requestId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    return res.json({ 
      message: 'Friend request rejected',
      requestId
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /requests/:id
 * Delete/cancel a friend request (can only be done by sender)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { fromUserID } = req.body || {};
    
    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ error: 'Valid request ID is required' });
    }

    if (!fromUserID) {
      return res.status(400).json({ error: 'fromUserID is required to cancel request' });
    }

    const result = await query(
      `DELETE FROM "RelationshipRequests" 
       WHERE id = $1 AND "fromUserID" = $2
       RETURNING id`,
      [requestId, fromUserID]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found or unauthorized' });
    }

    return res.json({ 
      message: 'Friend request cancelled',
      requestId
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
