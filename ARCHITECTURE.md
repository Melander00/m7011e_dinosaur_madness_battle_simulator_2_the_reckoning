# Architecture Overview

## Shared Database Approach

All microservices in the Dinosaur Madness project connect to a single shared PostgreSQL database. While this breaks traditional microservice isolation principles, it's an acceptable trade-off for:
- Faster development and prototyping
- Reduced infrastructure complexity
- Easier cross-service queries
- Simplified deployment

## Project Structure

```
m7011e_dinosaur_madness_battle_simulator_2_the_reckoning/
├── shared/
│   ├── db/
│   │   ├── index.js           # Shared connection pool & query helper
│   │   ├── schemas/
│   │   │   ├── friend.js      # Friend service tables
│   │   │   ├── leaderboard.js # Leaderboard service tables (future)
│   │   │   └── battle.js      # Battle service tables (future)
│   │   ├── README.md
│   │   └── GUIDE.md           # Developer guide
│   └── package.json
│
├── friend-service/            # Manages friendships & requests
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── users.js
│   │   │   ├── friendships.js
│   │   │   └── requests.js
│   ├── package.json
│   └── README.md
│
├── leaderboard-service/       # (to be implemented)
├── battle-service/            # (to be implemented)
├── auth-service/              # (existing)
└── frontend/                  # (existing)
```

## Database Tables

### Shared Tables (Used by Multiple Services)

- **USER**: Core user data, referenced by all services
  - Primary key: `userID`
  - Used by: friend-service, leaderboard-service, battle-service, auth-service

### Friend Service Tables

- **USER_RELATIONSHIP**: Friendship connections
  - Primary key: (`userID1`, `userID2`)
  - Constraint: `userID1` < `userID2` (prevents duplicates)
  
- **RelationshipRequests**: Pending/accepted/rejected friend requests
  - Primary key: `id`
  - Foreign keys: `fromUserID`, `toUserID`

### Future Service Tables

- **LEADERBOARD**: User scores and rankings
- **BATTLE**: Battle history and results
- **AUTH**: Authentication tokens and sessions

## How Services Interact

### Direct Database Access (Current)
```
Friend Service ──┐
                 ├──> Shared PostgreSQL Database
Leaderboard ────┤         (All tables accessible)
                 │
Battle Service ──┘
```

### Via Shared Module
All services import `shared/db`:
```javascript
const { query, initializeSchema } = require('../../shared/db');
```

## API Endpoints by Service

### Friend Service (Port 3001)
- `GET /users` - List users
- `GET /friendships/:userId` - Get user's friends
- `POST /friendships` - Create friendship
- `GET /requests/incoming/:userId` - Get friend requests
- `POST /requests` - Send friend request
- `PUT /requests/:id/accept` - Accept request

### Leaderboard Service (Port 3002) - Future
- `GET /leaderboard` - Get top players
- `GET /leaderboard/:userId` - Get user rank
- `POST /leaderboard/update` - Update scores

### Battle Service (Port 3003) - Future
- `POST /battle/start` - Start new battle
- `GET /battle/:id` - Get battle details
- `GET /battle/history/:userId` - User battle history

## Development Workflow

### Adding a New Service

1. **Create service directory**
   ```bash
   mkdir new-service
   cd new-service
   npm init -y
   npm install express cors morgan dotenv
   ```

2. **Create schema file**
   ```bash
   # shared/db/schemas/newservice.js
   ```

3. **Register schema** in `shared/db/index.js`

4. **Import shared DB** in your service
   ```javascript
   const { query, initializeSchema } = require('../../shared/db');
   ```

5. **Initialize on startup**
   ```javascript
   await initializeSchema('newservice');
   ```

### Environment Setup

All services need the same `.env`:
```env
PORT=300X                    # Unique per service
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=dinosaur_game
PGPORT=5432
DB_QUERY_LOG=true
```

## Migration Path (Future Considerations)

When the project needs true microservice isolation:

1. **Database per Service**
   - Each service gets its own database
   - Maintain data consistency via events

2. **Event-Driven Architecture**
   - Use message queue (RabbitMQ/Kafka)
   - Services publish/subscribe to events
   - Example: `UserCreated`, `FriendshipFormed`

3. **API Gateway**
   - Single entry point for all services
   - Handles routing, auth, rate limiting

4. **Service Mesh** (Kubernetes)
   - Istio or Linkerd for service communication
   - Built-in observability and security

But for now, **shared database = simplicity**! 🚀

## Resources

- [Friend Service README](../friend-service/README.md)
- [Shared DB Guide](./db/GUIDE.md)
- [Integration Examples](../friend-service/INTEGRATION.md)
