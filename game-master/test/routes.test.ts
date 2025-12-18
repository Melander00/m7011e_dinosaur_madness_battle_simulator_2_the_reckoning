import express, { Express } from "express";
import request from "supertest";
import { initRoutes } from "../src/routes"; // update path

// ---- Mock all external dependencies ----

jest.mock("../src/auth/keycloak", () => ({
  requireAuth: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock("../src/monitoring/prometheus", () => ({
  getMetrics: jest.fn(),
  incRequestCount: jest.fn(),
  createRequestDuration: jest.fn(() => ({
    end: jest.fn(),
  })),
}));

jest.mock("../src/db/redis", () => ({
  getUserActiveMatch: jest.fn(),
  getMatchById: jest.fn(),
}));

// Import mocks
import { requireAuth } from "../src/auth/keycloak";
import {
    getMatchById,
    getUserActiveMatch,
} from "../src/db/redis";
import { createRequestDuration, getMetrics, incRequestCount } from "../src/monitoring/prometheus";

describe("initRoutes", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    initRoutes(app);

    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // METRICS ROUTE
  // -------------------------------------------------------------------------

  test("GET /metrics returns metrics with correct headers", async () => {
    (getMetrics as jest.Mock).mockResolvedValue({
      contentType: "text/plain",
      metrics: "some-metrics-data",
    });

    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toBe("some-metrics-data");
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(getMetrics).toHaveBeenCalled();
  });

  test("GET /metrics handles getMetrics error", async () => {
    (getMetrics as jest.Mock).mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/metrics");

    // Express default behavior returns 500 on async error if no handler
    expect(res.status).toBe(500);
  });

// -------------------------------------------------------------------------
  // MATCH ROUTE
  // -------------------------------------------------------------------------

  test("GET /match returns 500 if userId is missing", async () => {
    // Mock requireAuth so it injects user but with sub = null
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { sub: null };
      next();
    });

    const res = await request(app).get("/match");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Userid is null for some reason");
    expect(incRequestCount).toHaveBeenCalledWith(500, {
      method: "GET",
      endpoint: "/match",
    });
  });

  test("GET /match returns 400 if no active match", async () => {
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { sub: "user123" };
      next();
    });

    (getUserActiveMatch as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/match");

    expect(res.status).toBe(400);
    expect(res.text).toBe("You dont have an active match.");
    expect(incRequestCount).toHaveBeenCalledWith(400, {
      method: "GET",
      endpoint: "/match",
    });
  });

  test("GET /match returns 500 if matchId exists but missing server data", async () => {
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { sub: "user123" };
      next();
    });

    (getUserActiveMatch as jest.Mock).mockResolvedValue("match123");
    (getMatchById as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/match");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Match exists but server data is missing");
    expect(incRequestCount).toHaveBeenCalledWith(500, {
      method: "GET",
      endpoint: "/match",
    });
  });

  test("GET /match happy path returns match data", async () => {
    (requireAuth as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { sub: "user123" };
      next();
    });

    (getUserActiveMatch as jest.Mock).mockResolvedValue("match123");
    (getMatchById as jest.Mock).mockResolvedValue({
      domain: "example.com",
      subpath: "/path",
    });

    const mockDur = { end: jest.fn() };
    (createRequestDuration as jest.Mock).mockReturnValue(mockDur);

    const res = await request(app).get("/match");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      domain: "example.com",
      subpath: "/path",
    });

    expect(getUserActiveMatch).toHaveBeenCalledWith("user123");
    expect(getMatchById).toHaveBeenCalledWith("match123");
    expect(mockDur.end).toHaveBeenCalled();
    expect(incRequestCount).toHaveBeenCalledWith(200, {
      method: "GET",
      endpoint: "/match",
    });
  });

  test("requireAuth middleware should be called", async () => {
    await request(app).get("/match");

    expect(requireAuth).toHaveBeenCalled();
  });
});