import express from 'express';
import { requireAuth } from '../../../shared/auth/keycloak';
import { getMe, getTop } from '../repositories/rankRepository';

const router = express.Router();

// GET /elo/top?limit=10 - public
router.get('/top', async (req, res, next) => {
  try {
    const limitParam = parseInt((req.query.limit as string) || '10', 10);
    const limit = Number.isFinite(limitParam) ? limitParam : 10;
    const rows = await getTop(limit);
    const response = rows.map(r => ({ rank: r.rank, userId: r.userid, rankedPoints: r.rankedpoints }));
    res.status(200).json({ data: response });
  } catch (err) {
    next(err);
  }
});

// Get authenticated user's rank and points - protected endpoint
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(500).json({ error: 'User ID not found in token' });

    const me = await getMe(userId);
    if (!me) return res.status(404).json({ error: 'User not found on leaderboard' });

    res.status(200).json({ userId: me.userid, rankedPoints: me.rankedpoints, rank: me.rank });
  } catch (err) {
    next(err);
  }
});

export default router;
