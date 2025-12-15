# Friend Service

A microservice for managing user friendships and friend requests in the Dinosaur Madness game.

## Features

- **User Management**: Full CRUD operations for users
- **Friendship Management**: Create, read, and delete friendships with bidirectional lookup
- **Friend Requests**: Send, accept, reject, and cancel friend requests
- Automatic Schema Initialization: Database tables are created automatically on startup
- Cascading Deletes: Deleting a user automatically removes all their friendships and requests
- **Shared Database**: Uses the common `shared/db` module that all microservices share for simplified database access

## Database Architecture

This service connects to a **shared PostgreSQL database** used by all microservices. The database module is located at `../shared/db/` and provides:
- Shared connection pool
- Common query helper
- Centralized schema management

Other services can access the USER table and other shared tables through the same database module.

## Database Schema

### USER Table
```sql
CREATE TABLE "USER" (
  "userID" SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### USER_RELATIONSHIP Table
```sql
CREATE TABLE "USER_RELATIONSHIP" (
  "userID1" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
  "userID2" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY ("userID1", "userID2"),
  CHECK ("userID1" < "userID2")
);
```

**Note**: The CHECK constraint ensures `userID1` < `userID2`, eliminating duplicate entries (e.g., [1,2] and [2,1]).

### RelationshipRequests Table
```sql
CREATE TABLE "RelationshipRequests" (
  id SERIAL PRIMARY KEY,
  "fromUserID" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
  "toUserID" INTEGER NOT NULL REFERENCES "USER"("userID") ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE ("fromUserID", "toUserID"),
  CHECK ("fromUserID" != "toUserID")
);
```

## API Endpoints

### Health Check
```
GET /healthz
Response: { "status": "ok", "service": "friend-service", "timestamp": "..." }
```

### User Endpoints

| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| GET | `/users` | List all users | Query: `?search=username&limit=50` |
| GET | `/users/:id` | Get specific user | - |
| POST | `/users` | Create new user | `{ "username": "string", "userID": number (optional) }` |
| PUT | `/users/:id` | Update username | `{ "username": "string" }` |
| DELETE | `/users/:id` | Delete user | - |

### Friendship Endpoints

| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| GET | `/friendships/:userId` | Get all friends for a user | - |
| GET | `/friendships/:userId/count` | Get friend count | - |
| POST | `/friendships` | Create friendship | `{ "userID1": number, "userID2": number }` |
| DELETE | `/friendships` | Delete friendship | `{ "userID1": number, "userID2": number }` |

**Important**: When querying friendships for a user, the service searches **both** `userID1` and `userID2` columns in the `USER_RELATIONSHIP` table, returning all matching friends regardless of which column contains the user's ID.

### Friend Request Endpoints

| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| GET | `/requests/incoming/:userId` | Get incoming friend requests | - |
| GET | `/requests/outgoing/:userId` | Get outgoing friend requests | - |
| POST | `/requests` | Send friend request | `{ "fromUserID": number, "toUserID": number }` |
| PUT | `/requests/:id/accept` | Accept request (creates friendship) | - |
| PUT | `/requests/:id/reject` | Reject request | - |
| DELETE | `/requests/:id` | Cancel request | `{ "fromUserID": number }` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3001` |
| `DATABASE_URL` | Full PostgreSQL connection string | - |
| `PGHOST` | PostgreSQL host | - |
| `PGUSER` | PostgreSQL user | - |
| `PGPASSWORD` | PostgreSQL password | - |
| `PGDATABASE` | PostgreSQL database name | - |
| `PGPORT` | PostgreSQL port | - |
| `PGSSL` | Enable SSL (`true`/`false`) | `false` |
| `DB_QUERY_LOG` | Log all queries (`true`/`false`) | `false` |
| `NODE_ENV` | Environment mode | `development` |

## Installation & Setup

```bash
cd friend-service
npm install
```

Create a `.env` file:
```env
PORT=3001
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=dinosaur_game
PGPORT=5432
DB_QUERY_LOG=true
```

## Running the Service

```bash
# Development mode (with auto-reload)
npm run dev

# MIGHT need to run this (if there are other PostgreSQL processes interferring on 5432)
Stop-Service -Name postgresql*

# Production mode
npm start
```

The service will:
1. Initialize the database schema automatically
2. Start listening on the configured port (default: 3001)

## Example Usage

### Create Users
```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username": "player1"}'

curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username": "player2"}'
```

### Send Friend Request
```bash
curl -X POST http://localhost:3001/requests \
  -H "Content-Type: application/json" \
  -d '{"fromUserID": 1, "toUserID": 2}'
```

### Get Incoming Requests
```bash
curl http://localhost:3001/requests/incoming/2
```

### Accept Friend Request
```bash
curl -X PUT http://localhost:3001/requests/1/accept
```

### Get Friends for a User
```bash
curl http://localhost:3001/friendships/1
```

### Delete Friendship
```bash
curl -X DELETE http://localhost:3001/friendships \
  -H "Content-Type: application/json" \
  -d '{"userID1": 1, "userID2": 2}'
```

## Response Examples

### Get Friends Response
```json
{
  "userId": 1,
  "friends": [
    {
      "userID": 2,
      "username": "player2",
      "created_at": "2025-12-01T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Incoming Requests Response
```json
{
  "userId": 2,
  "requests": [
    {
      "id": 1,
      "fromUserID": 1,
      "from_username": "player1",
      "status": "pending",
      "created_at": "2025-12-01T10:25:00.000Z"
    }
  ],
  "count": 1
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message description"
}
```

## Future Extensions

This is a barebones implementation that can be extended with:
- Authentication & authorization (JWT tokens)
- Rate limiting
- Pagination for large result sets
- WebSocket notifications for real-time friend request updates
- Blocking/muting functionality
- Friend suggestions algorithm
- Unit and integration tests
- Dockerization
- API documentation (Swagger/OpenAPI)

## License

ISC
