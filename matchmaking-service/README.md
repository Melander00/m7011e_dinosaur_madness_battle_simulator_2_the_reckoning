# Matchmaking Service

Matchmaking service for pairing players based on their ELO rating.

## Features

- **Queue Management**: Players can join/leave the matchmaking queue
- **ELO-based Matching**: Matches players with similar ELO ratings
- **Dynamic ELO Range**: Expands acceptable ELO difference based on wait time
- **Background Processing**: Continuously checks for matches every 5 seconds
- **RabbitMQ Integration**: Publishes match found events to game-master service
- **Queue Statistics**: Track queue size and average wait times

## Environment Variables

```env
PORT=3004
DATABASE_URL=postgresql://user:password@localhost:5432/dinosaur_game
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=dinosaur_game
PGPORT=5432
RABBITMQ_URL=amqp://localhost:5672
LEADERBOARD_SERVICE_URL=http://localhost:3003
NODE_ENV=development
```

## API Endpoints

### POST /queue/join
Join the matchmaking queue. Fetches user's ELO from leaderboard service.

**Headers:**
- `Authorization: Bearer <token>`

**Body:**
```json
{
  "userId": "user-id-from-keycloak"
}
```

**Response:**
```json
{
  "message": "Successfully joined matchmaking queue",
  "userId": "user-123",
  "elo": 1500,
  "queuePosition": 3
}
```

### POST /queue/leave
Leave the matchmaking queue.

**Body:**
```json
{
  "userId": "user-id"
}
```

### GET /queue/status?userId=<id>
Get current queue status for a user.

**Response:**
```json
{
  "inQueue": true,
  "queuePosition": 2,
  "userId": "user-123"
}
```

### GET /queue/stats
Get overall queue statistics.

**Response:**
```json
{
  "totalPlayersInQueue": 15,
  "averageWaitTimeSeconds": 23
}
```

## Matchmaking Algorithm

1. Finds the player who has been waiting the longest
2. Calculates acceptable ELO range (increases with wait time)
3. Searches for the closest ELO match within that range
4. Removes both players from queue
5. Publishes match to RabbitMQ for game-master service

**Default Settings:**
- Base ELO difference: 200
- Additional range per 30 seconds wait: +50
- Matchmaking check interval: 5 seconds

## Database Schema

```sql
CREATE TABLE matchmaking_queue (
  userId TEXT PRIMARY KEY,
  elo INTEGER NOT NULL,
  queue_start_time TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## RabbitMQ Message Format

**Exchange:** `game-events`  
**Routing Key:** `match.found`

```json
{
  "type": "MATCH_FOUND",
  "timestamp": "2025-12-19T...",
  "match": {
    "player1": "user-id-1",
    "player2": "user-id-2"
  }
}
```

## Setup

```bash
npm install
npm run build
npm start

# Development
npm run dev
```
