import express from "express";
import { requireAuth } from "../auth/keycloak";
import * as userRepo from "../repositories/userRepository";
import { createRequestDuration, incRequestCount } from "../monitoring/prometheus";

const router = express.Router();

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * POST /users/me
 * Ensure user exists (upsert)
 */
export async function postUsersMe(req: express.Request, res: express.Response, next: express.NextFunction) {
  const timer = createRequestDuration({ method: "POST", endpoint: "/users/me" });

  try {
    const userId = req.userId;
    if (!userId || !isUuid(userId)) {
      incRequestCount(500, { method: "POST", endpoint: "/users/me" });
      return res.status(500).json({ error: "Invalid userId in token" });
    }

    const username = req.user?.preferred_username ?? null;

    await userRepo.upsertUser(userId, username);

    incRequestCount(200, { method: "POST", endpoint: "/users/me" });
    return res.status(200).json({ userId, username });
  } catch (err) {
    incRequestCount(500, { method: "POST", endpoint: "/users/me" });
    return next(err);
  } finally {
    timer.end();
  }
}

router.post("/me", requireAuth, postUsersMe);

/**
 * GET /users/me
 * Return my profile
 * DEV: auto-create user if missing
 */
export async function getUsersMe(req: express.Request, res: express.Response, next: express.NextFunction) {
  const timer = createRequestDuration({ method: "GET", endpoint: "/users/me" });

  try {
    const userId = req.userId;
    if (!userId || !isUuid(userId)) {
      incRequestCount(500, { method: "GET", endpoint: "/users/me" });
      return res.status(500).json({ error: "Invalid userId in token" });
    }

    let user = await userRepo.getUserById(userId);

    /**
     * PROD-SAFE lazy user provisioning
     * requireAuth already verified the JWT
     */
    if (!user) {
      const username = req.user?.preferred_username ?? null;
      await userRepo.upsertUser(userId, username);
      user = await userRepo.getUserById(userId);
    }

    if (!user) {
      incRequestCount(404, { method: "GET", endpoint: "/users/me" });
      return res.status(404).json({ error: "User not found", userId });
    }

    incRequestCount(200, { method: "GET", endpoint: "/users/me" });
    return res.json({
      userId: user.userid,
      username: user.username,
      quote: user.quote,
    });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/users/me" });
    return next(err);
  } finally {
    timer.end();
  }
}

router.get("/me", requireAuth, getUsersMe);

/**
 * GET /users/:userId
 * Public lookup
 */
export async function getPublicUserById(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const timer = createRequestDuration({ method: "GET", endpoint: "/users/:userId" });

  try {
    const { userId } = req.params;

    if (!isUuid(userId)) {
      incRequestCount(400, { method: "GET", endpoint: "/users/:userId" });
      return res.status(400).json({ error: "Invalid userId" });
    }

    const user = await userRepo.getUserById(userId);
    if (!user) {
      incRequestCount(404, { method: "GET", endpoint: "/users/:userId" });
      return res.status(404).json({ error: "User not found", userId });
    }

    incRequestCount(200, { method: "GET", endpoint: "/users/:userId" });
    return res.json({
      userId: user.userid,
      username: user.username,
      quote: user.quote,
    });
  } catch (err) {
    incRequestCount(500, { method: "GET", endpoint: "/users/:userId" });
    return next(err);
  } finally {
    timer.end();
  }
}

router.get("/:userId", getPublicUserById);

export default router;

