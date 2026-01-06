import { Pool, QueryResult, QueryResultRow } from 'pg';

// PostgreSQL connection pool
export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
//   ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('PostgreSQL pool error:', err);
});

pool.on('connect', () => {
  if (process.env.DB_QUERY_LOG === 'true') {
    console.log('New database connection established');
  }
});

// Query helper function with type safety
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DB_QUERY_LOG === 'true') {
    console.log('executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

// Health check function
export async function healthCheck(): Promise<{ status: string; time?: Date; error?: string }> {
  try {
    const result = await query<{ time: Date }>('SELECT NOW() as time');
    return { status: 'healthy', time: result.rows[0].time };
  } catch (err: any) {
    return { status: 'unhealthy', error: err.message };
  }
}
