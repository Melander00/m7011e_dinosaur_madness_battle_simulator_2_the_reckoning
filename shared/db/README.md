# Shared Database Module

This module provides shared database access for all microservices in the Dinosaur Madness project.

## Why Shared?

For simplicity, all microservices connect to the same PostgreSQL database and can access each other's tables. This approach:
- ✅ Simplifies development and deployment
- ✅ Reduces infrastructure complexity
- ✅ Allows for easier cross-service queries
- ⚠️ Creates coupling between services (acceptable trade-off for this project)

## Usage

### In any microservice:

```javascript
const { query, initializeSchema } = require('../shared/db');

// Use the query helper
const { rows } = await query('SELECT * FROM "USER" WHERE "userID" = $1', [userId]);

// Initialize your service's tables
await initializeSchema();
```

## Schema Management

Each service should register its schema initialization function:

```javascript
// In shared/db/index.js
const schemas = {
  friend: require('./schemas/friend'),
  leaderboard: require('./schemas/leaderboard'),
  battle: require('./schemas/battle'),
  // ... other services
};
```

## Environment Variables

All services use the same database connection environment variables:
- `DATABASE_URL` - Full connection string (optional)
- `PGHOST` - PostgreSQL host
- `PGUSER` - PostgreSQL user
- `PGPASSWORD` - PostgreSQL password
- `PGDATABASE` - PostgreSQL database name
- `PGPORT` - PostgreSQL port (default: 5432)
- `PGSSL` - Enable SSL (`true`/`false`)
- `DB_QUERY_LOG` - Log queries (`true`/`false`)
