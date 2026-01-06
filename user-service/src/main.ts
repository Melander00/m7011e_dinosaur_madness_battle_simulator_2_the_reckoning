import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { healthCheck } from "./db";
import { getMetrics } from "./monitoring/prometheus";
import usersRouter from "./routes/users";

const app = express();
const PORT = parseInt(process.env.PORT || "3002", 10);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/healthz", async (_req, res) => {
  const db = await healthCheck();
  res.json({
    status: db.status === "healthy" ? "ok" : "degraded",
    service: "user-service",
    database: db,
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (_req, res) => {
  const data = await getMetrics();
  res.set("Content-Type", data.contentType);
  res.end(data.metrics);
});

app.use("/users", usersRouter);

app.get("/", (_req, res) => {
  res.json({ service: "user-service", version: "1.0.0" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`user-service listening on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

