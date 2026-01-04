import { Pool, QueryResult, QueryResultRow } from 'pg';

// PostgreSQL connection pool (shared across all services)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Increased pool size for multiple services
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

// Schema initializer type
export interface SchemaInitializer {
  initialize: (queryFn: typeof query) => Promise<void>;
}

// Import schema initializers from each service
const schemas: Record<string, SchemaInitializer> = {
  user: require('./schemas/user'),
  friend: require('./schemas/friend'),
  matchmaking: require('./schemas/matchmaking'),
  // Add other service schemas here as they're created
  // leaderboard: require('./schemas/leaderboard'),
  // battle: require('./schemas/battle'),
};

// Initialize all database schemas
export async function initializeSchema(serviceName?: string | null): Promise<void> {
  try {
    if (serviceName && schemas[serviceName]) {
      // Initialize specific service schema
      console.log(`Initializing ${serviceName} schema...`);
      await schemas[serviceName].initialize(query);
      console.log(`${serviceName} schema initialized successfully`);
    } else {
      // Initialize all schemas
      console.log('Initializing all database schemas...');
      for (const [name, schema] of Object.entries(schemas)) {
        await schema.initialize(query);
        console.log(`${name} schema initialized`);
      }
      console.log('All database schemas initialized successfully');
    }
  } catch (err) {
    console.error('Error initializing database schema:', err);
    throw err;
  }
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
