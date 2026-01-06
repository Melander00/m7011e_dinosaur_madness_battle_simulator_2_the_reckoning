import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import { requireAuth } from "./auth/keycloak";
import { healthCheck } from "./db";
import { getMetrics } from "./monitoring/prometheus";
import { getOpenApiSpecs } from "./openapi/openapi";
import queueRouter from "./routes/queue";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/healthz", async (_req, res) => {
  const dbHealth = await healthCheck();
  res.json({
    status: dbHealth.status === "healthy" ? "ok" : "degraded",
    service: "matchmaking-service",
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
});

// Auth
app.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    sub: req.userId,
    email: req.user?.email,
    username: req.user?.preferred_username,
    name: req.user?.name,
    roles: req.user?.realm_access?.roles || [],
    emailVerified: req.user?.email_verified,
  });
});

// Routes
app.use("/queue", queueRouter);

// Root
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'matchmaking-service',
    version: '1.0.0',
    endpoints: {
      queue: {
        'POST /queue/join': 'Join matchmaking queue (requires auth token)',
        'POST /queue/leave': 'Leave matchmaking queue',
        'GET /queue/status?userId=<id>': 'Get queue status for user',
        'GET /queue/stats': 'Get overall queue statistics'
      }
    }
  });
});

// Metrics
app.get("/metrics", async (_req, res) => {
  const data = await getMetrics();
  res.set("Content-Type", data.contentType);
  res.end(data.metrics);
});

// OpenAPI Specs
app.get("/openapi", (req, res) => {
    res.json(getOpenApiSpecs())
})

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err.status || 500).json({ error: err.message });
});

export default app;
