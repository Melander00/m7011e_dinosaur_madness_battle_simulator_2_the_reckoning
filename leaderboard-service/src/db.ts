import { Pool, QueryResult } from "pg";

// Simple PostgreSQL connection for leaderboard-service
// Schema managed by db/migrations (Flyway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
});

// ---- Observability hooks ----

// Fired whenever a new client connects to Postgres
pool.on("connect", () => {
  console.log("[leaderboard-service] Connected to PostgreSQL");
});

// Fired on unexpected idle client errors
pool.on("error", (err) => {
  console.error("[leaderboard-service] PostgreSQL pool error:", err);
});

// ---- Query helper ----
export async function query(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  return pool.query(text, params);
}
