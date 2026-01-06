import path from "node:path";
import fs from "node:fs/promises";
import { Client, type QueryResultRow } from "pg";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | undefined;

async function runMigrations(databaseUrl: string) {
  // __dirname = user-service/tests/integration/setup
  // We need to reach repo-root/db/migrations (4 levels up to repo root).
  const v1Path = path.resolve(__dirname, "../../../../db/migrations/V1__init.sql");
  const v2Path = path.resolve(__dirname, "../../../../db/migrations/V2__username.sql");


  const [v1, v2] = await Promise.all([fs.readFile(v1Path, "utf8"), fs.readFile(v2Path, "utf8")]);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  // Proves: integration tests run against the real schema (Flyway SQL), not ad-hoc tables.
  await client.query(v1);
  await client.query(v2);

  await client.end();
}

export async function startTestDb(): Promise<StartedPostgreSqlContainer> {
  if (container) return container;

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  await runMigrations(container.getConnectionUri());
  return container;
}

export async function stopTestDb() {
  if (!container) return;
  await container.stop();
  container = undefined;
}

export function applyTestDbEnv(databaseUrl: string) {
  // Ensure the service connects ONLY to the container DB (never a host/prod DB).
  process.env.DATABASE_URL = databaseUrl;
  const url = new URL(databaseUrl);
  process.env.PGHOST = url.hostname;
  process.env.PGPORT = url.port;
  process.env.PGUSER = decodeURIComponent(url.username);
  process.env.PGPASSWORD = decodeURIComponent(url.password);
  process.env.PGDATABASE = url.pathname.replace(/^\//, "");
  process.env.PGSSL = "false";
}

export async function resetUsersTable(databaseUrl: string) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("TRUNCATE TABLE users CASCADE");
  await client.end();
}

export async function queryTestDb<T extends QueryResultRow = any>(
  databaseUrl: string,
  text: string,
  params?: any[]
) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const result = await client.query<T>(text, params);
  await client.end();
  return result;
}
