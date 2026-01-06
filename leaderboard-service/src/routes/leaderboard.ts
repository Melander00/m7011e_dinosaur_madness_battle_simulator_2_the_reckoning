import express from "express";
import { requireAuth } from "../auth/keycloak";
import * as rankRepo from "../repositories/rankRepository";
import {
  createRequestDuration,
  incRequestCount,
  PromProps,
} from "../monitoring/prometheus";

const router = express.Router();

/**
 * GET /leaderboard/top?limit=10
 * Public endpoint
 */
router.get("/top", async (req, res, next) => {
  const props: PromProps = {
    method: "GET",
    endpoint: "/leaderboard/top",
  };
  const timer = createRequestDuration(props);

  try {
    const limitParam = parseInt(req.query.limit as string, 10);
    const limit = Math.min(
      isNaN(limitParam) || limitParam < 1 ? 10 : limitParam,
      100,
    );

    const rows = await rankRepo.getTop(limit);

    timer.end();
    incRequestCount(200, props);

    return res.json({
      leaderboard: rows.map((r) => ({
        rank: r.rank,
        userId: r.userid,
        rankedPoints: r.rankedpoints,
      })),
      count: rows.length,
    });
  } catch (err) {
    incRequestCount(500, props);
    return next(err);
  }
});

/**
 * GET /leaderboard/me
 * Authenticated endpoint
 */
router.get("/me", requireAuth, async (req, res, next) => {
  const props: PromProps = {
    method: "GET",
    endpoint: "/leaderboard/me",
  };
  const timer = createRequestDuration(props);

  try {
    const userId = req.userId;

    if (!userId) {
      incRequestCount(500, props);
      return res.status(500).json({ error: "User ID not found in token" });
    }

    const result = await rankRepo.getMe(userId);

    if (!result) {
      timer.end();
      incRequestCount(404, props);
      return res.status(404).json({
        error: "User not found in leaderboard",
        userId,
      });
    }

    timer.end();
    incRequestCount(200, props);

    return res.json({
      userId: result.userid,
      rank: result.rank,
      rankedPoints: result.rankedpoints,
    });
  } catch (err) {
    incRequestCount(500, props);
    return next(err);
  }
});

/**
 * GET /leaderboard/nearby?range=5
 * Authenticated endpoint
 */
router.get("/nearby", requireAuth, async (req, res, next) => {
  const props: PromProps = {
    method: "GET",
    endpoint: "/leaderboard/nearby",
  };
  const timer = createRequestDuration(props);

  try {
    const userId = req.userId;

    if (!userId) {
      incRequestCount(500, props);
      return res.status(500).json({ error: "User ID not found in token" });
    }

    const rangeParam = parseInt(req.query.range as string, 10);
    const range = Math.min(
      isNaN(rangeParam) || rangeParam < 1 ? 5 : rangeParam,
      50,
    );

    const rows = await rankRepo.getNearby(userId, range);

    if (rows.length === 0) {
      timer.end();
      incRequestCount(404, props);
      return res.status(404).json({
        error: "User not found in leaderboard",
        userId,
      });
    }

    timer.end();
    incRequestCount(200, props);

    return res.json({
      nearby: rows.map((r) => ({
        rank: r.rank,
        userId: r.userid,
        rankedPoints: r.rankedpoints,
        isCurrentUser: r.userid === userId,
      })),
      count: rows.length,
    });
  } catch (err) {
    incRequestCount(500, props);
    return next(err);
  }
});

export default router;

