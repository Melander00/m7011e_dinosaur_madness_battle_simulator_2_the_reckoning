# Shared Database Module - Quick Start Guide

## Overview

All microservices in this project share a common PostgreSQL database and use the `shared/db` module for database access. This simplifies development and deployment while allowing services to access each other's tables when needed.

## For New Microservices

### 1. Add Shared Module Dependency

In your service's `package.json`:
```json
{
  "dependencies": {
    "pg": "^8.12.0"
  }
}
```

### 2. Import the Database Module

```javascript
const { query, initializeSchema } = require('../shared/db');
```

The path depends on your service location:
- `friend-service/`: use `../../shared/db`
- `leaderboard-service/`: use `../../shared/db`
- Root level services: use `../shared/db`

### 3. Create Your Schema File

Create `shared/db/schemas/YOUR_SERVICE.js`:

```javascript
/**
 * Your Service Database Schema
 * Tables: YOUR_TABLE1, YOUR_TABLE2
 */

async function initialize(query) {
  // Create your tables
  await query(`
    CREATE TABLE IF NOT EXISTS "YOUR_TABLE" (
      id SERIAL PRIMARY KEY,
      "userID" INTEGER REFERENCES "USER"("userID") ON DELETE CASCADE,
      data TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_your_table_user 
    ON "YOUR_TABLE"("userID");
  `);
}

module.exports = { initialize };
```

### 4. Register Your Schema

In `shared/db/index.js`, add your schema:

```javascript
const schemas = {
  friend: require('./schemas/friend'),
  yourservice: require('./schemas/yourservice'), // Add this line
};
```

### 5. Initialize in Your Server

```javascript
const { initializeSchema } = require('../../shared/db');

async function start() {
  try {
    // Initialize only your service's schema
    await initializeSchema('yourservice');
    
    // Start your server
    app.listen(PORT, () => {
      console.log(`your-service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
```

### 6. Use in Routes

```javascript
const { query } = require('../../../shared/db');

router.get('/data', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM "YOUR_TABLE" WHERE "userID" = $1',
    [req.params.userId]
  );
  res.json(rows);
});
```

## Accessing Shared Tables

### USER Table (Shared by All Services)

The `USER` table is available to all services:

```javascript
// Check if user exists
const { rows } = await query(
  'SELECT "userID", username FROM "USER" WHERE "userID" = $1',
  [userId]
);

if (rows.length === 0) {
  return res.status(404).json({ error: 'User not found' });
}
```

### Cross-Service Queries

You can query tables from other services:

```javascript
// Example: Get user's friends and their leaderboard scores
const { rows } = await query(`
  SELECT 
    u.username,
    ur."userID2" as friend_id,
    lb.score
  FROM "USER_RELATIONSHIP" ur
  JOIN "USER" u ON u."userID" = ur."userID2"
  LEFT JOIN "LEADERBOARD" lb ON lb."userID" = ur."userID2"
  WHERE ur."userID1" = $1
  ORDER BY lb.score DESC
`, [userId]);
```

## Environment Variables

All services use the same database connection variables:

```env
# PostgreSQL Connection
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=dinosaur_game
PGPORT=5432

# Optional
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PGSSL=false
DB_QUERY_LOG=true
```

## Database Health Check

```javascript
const { healthCheck } = require('../../shared/db');

app.get('/healthz', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({ 
    status: 'ok',
    database: dbHealth
  });
});
```

## Best Practices

### ✅ DO:
- Use parameterized queries to prevent SQL injection
- Create indexes for frequently queried columns
- Use transactions for multi-step operations
- Reference the USER table via foreign keys
- Keep table names in UPPER_CASE with quotes

### ❌ DON'T:
- Create duplicate USER tables in your service
- Modify other services' tables without coordination
- Use SELECT * in production queries
- Forget to handle connection errors

## Transaction Example

```javascript
const { pool } = require('../../shared/db');

async function complexOperation(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const res1 = await client.query('INSERT INTO ... RETURNING id', [data]);
    const id = res1.rows[0].id;
    
    await client.query('INSERT INTO ... VALUES ($1, $2)', [id, data]);
    
    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

## Troubleshooting

### Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U postgres -d dinosaur_game
```

### Schema Issues
```javascript
// Force re-initialization (development only)
await query('DROP TABLE IF EXISTS "YOUR_TABLE" CASCADE');
await initializeSchema('yourservice');
```

### Query Debugging
```env
# Enable query logging
DB_QUERY_LOG=true
```

## Example: Leaderboard Service Schema

```javascript
// shared/db/schemas/leaderboard.js
async function initialize(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS "LEADERBOARD" (
      id SERIAL PRIMARY KEY,
      "userID" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
      score INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE ("userID")
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_score 
    ON "LEADERBOARD"(score DESC);
  `);
}

module.exports = { initialize };
```

## Migration Strategy (Future)

When you outgrow the shared database approach:
1. Create separate databases per service
2. Use message queues (RabbitMQ, Kafka) for data sync
3. Implement API calls instead of direct table access
4. Use database replication for read-only cross-service queries

For now, the shared approach keeps things simple and fast to develop!
