import request from "supertest";
import app from "../src/app";

/**
 * Mocks
 */
jest.mock("../src/auth/keycloak", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user-123";
    req.user = {
      email: "test@example.com",
      preferred_username: "testuser",
      name: "Test User",
      realm_access: { roles: ["user"] },
      email_verified: true,
    };
    next();
  },
}));

jest.mock("../src/db", () => ({
  healthCheck: jest.fn().mockResolvedValue({ status: "healthy" }),
}));

jest.mock("../src/monitoring/prometheus", () => ({
  getMetrics: jest.fn().mockResolvedValue({
    contentType: "text/plain",
    metrics: "metric 1",
  }),
}));

jest.mock("../src/routes/queue", () => {
  const router = require("express").Router();
  router.get("/stats", (_req: any, res: any) => res.json({ total: 0 }));
  return router;
});

describe("Express app", () => {
  it("GET /healthz", async () => {
    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /me", async () => {
    const res = await request(app).get("/me");

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("user-123");
  });

  it("GET /metrics", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.text).toBe("metric 1");
  });

  it("404 handler", async () => {
    const res = await request(app).get("/nope");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint not found" });
  });
});
