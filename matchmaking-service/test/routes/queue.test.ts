import express from "express";
import request from "supertest";
import { requireAuth } from "../../src/auth/keycloak";
import * as prometheusModule from "../../src/monitoring/prometheus";
import queueRouter from "../../src/routes/queue";
import * as leaderboardModule from "../../src/services/leaderboard-client";
import * as matchmakingModule from "../../src/services/matchmaking-service";

// ----- Mock dependencies -----
jest.mock("../../src/auth/keycloak", () => ({
  requireAuth: jest.fn((req, res, next) => {
    req.userId = "user1"; // mock authenticated user
    return next();
  }),
}));

jest.mock("../../src/services/matchmaking-service", () => ({
  matchmakingService: {
    addToQueue: jest.fn(),
    removeFromQueue: jest.fn(),
    getQueuePosition: jest.fn(),
    getQueueStats: jest.fn(),
  },
}));

jest.mock("../../src/services/leaderboard-client", () => ({
  getUserElo: jest.fn(),
}));

jest.mock("../../src/monitoring/prometheus", () => ({
  createRequestDuration: jest.fn(() => ({ end: jest.fn() })),
  incRequestCount: jest.fn(),
}));

// ----- Setup express app -----
const app = express();
app.use(express.json());
app.use("/queue", queueRouter);

describe("/queue endpoints", () => {
  const matchmakingService = matchmakingModule.matchmakingService;
  const getUserElo = leaderboardModule.getUserElo as jest.MockedFunction<typeof leaderboardModule.getUserElo>;
  const incRequestCount = prometheusModule.incRequestCount as jest.MockedFunction<any>;
  const durEnd = { end: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (prometheusModule.createRequestDuration as jest.Mock).mockReturnValue(durEnd);
  });

  describe("POST /queue/join", () => {
    it("joins the queue successfully", async () => {
      getUserElo.mockResolvedValueOnce(1200);
      (matchmakingService.addToQueue as jest.Mock).mockResolvedValueOnce(undefined);
      (matchmakingService.getQueuePosition as jest.Mock).mockResolvedValueOnce(1);

      const res = await request(app).post("/queue/join").set("Authorization", "Bearer token");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: "Successfully joined matchmaking queue",
        userId: "user1",
        elo: 1200,
        queuePosition: 1,
      });

      expect(getUserElo).toHaveBeenCalledWith("user1");
      expect(matchmakingService.addToQueue).toHaveBeenCalledWith("user1", 1200);
      expect(matchmakingService.getQueuePosition).toHaveBeenCalledWith("user1");
      expect(durEnd.end).toHaveBeenCalled();
      expect(incRequestCount).toHaveBeenCalledWith(200, expect.any(Object));
    });

    it("returns 500 if userId missing", async () => {
      // Override requireAuth to remove userId
      (requireAuth as jest.Mock).mockImplementationOnce((req, res, next) => next());

      const res = await request(app).post("/queue/join").set("Authorization", "Bearer token");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("User ID not found in token");
    });
  });

  describe("POST /queue/leave", () => {
    it("leaves the queue successfully", async () => {
      (matchmakingService.removeFromQueue as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await request(app).post("/queue/leave").set("Authorization", "Bearer token");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        message: "Successfully left matchmaking queue",
        userId: "user1",
      });

      expect(matchmakingService.removeFromQueue).toHaveBeenCalledWith("user1");
      expect(durEnd.end).toHaveBeenCalled();
    });
  });

  describe("GET /queue/status", () => {
    it("returns queue position if in queue", async () => {
      (matchmakingService.getQueuePosition as jest.Mock).mockResolvedValueOnce(2);

      const res = await request(app).get("/queue/status").set("Authorization", "Bearer token");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        inQueue: true,
        queuePosition: 2,
        userId: "user1",
      });
    });

    it("returns 404 if user not in queue", async () => {
      (matchmakingService.getQueuePosition as jest.Mock).mockResolvedValueOnce(null);

      const res = await request(app).get("/queue/status").set("Authorization", "Bearer token");

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: "User not in queue",
        inQueue: false,
      });
    });
  });

  describe("GET /queue/stats", () => {
    it("returns queue stats", async () => {
      (matchmakingService.getQueueStats as jest.Mock).mockResolvedValueOnce({
        totalPlayers: 5,
        averageWaitTime: 12.3,
      });

      const res = await request(app).get("/queue/stats").set("Authorization", "Bearer token");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalPlayersInQueue: 5,
        averageWaitTimeSeconds: 12,
      });
    });
  });
});
