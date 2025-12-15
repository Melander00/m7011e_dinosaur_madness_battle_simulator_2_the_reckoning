# Friend Service Integration Guide

## Overview
The friend-service is a standalone microservice that can be integrated with your web application or API gateway. It provides complete CRUD operations for user friendships and friend requests.

## Integration with Frontend/API Gateway

### Architecture
```
Frontend/Client
    ↓
API Gateway (future)
    ↓
Friend Service (port 3001)
    ↓
PostgreSQL Database
```

### Frontend Integration Examples

#### Get Friends List
```javascript
// Fetch friends for a user
async function getFriends(userId) {
  const response = await fetch(`http://localhost:3001/friendships/${userId}`);
  const data = await response.json();
  return data.friends; // Array of friend objects
}
```

#### Send Friend Request
```javascript
async function sendFriendRequest(fromUserId, toUserId) {
  const response = await fetch('http://localhost:3001/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromUserID: fromUserId, toUserID: toUserId })
  });
  return await response.json();
}
```

#### Accept Friend Request
```javascript
async function acceptFriendRequest(requestId) {
  const response = await fetch(`http://localhost:3001/requests/${requestId}/accept`, {
    method: 'PUT'
  });
  return await response.json();
}
```

#### Search Users
```javascript
async function searchUsers(query) {
  const response = await fetch(`http://localhost:3001/users?search=${encodeURIComponent(query)}&limit=20`);
  const data = await response.json();
  return data.users;
}
```

### Example React Component

```jsx
import React, { useState, useEffect } from 'react';

function FriendsPage({ currentUserId }) {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  useEffect(() => {
    loadFriends();
    loadIncomingRequests();
  }, [currentUserId]);

  async function loadFriends() {
    const response = await fetch(`http://localhost:3001/friendships/${currentUserId}`);
    const data = await response.json();
    setFriends(data.friends);
  }

  async function loadIncomingRequests() {
    const response = await fetch(`http://localhost:3001/requests/incoming/${currentUserId}`);
    const data = await response.json();
    setIncomingRequests(data.requests);
  }

  async function handleAcceptRequest(requestId) {
    await fetch(`http://localhost:3001/requests/${requestId}/accept`, { method: 'PUT' });
    loadFriends();
    loadIncomingRequests();
  }

  return (
    <div>
      <h2>Friend Requests</h2>
      {incomingRequests.map(req => (
        <div key={req.id}>
          <span>{req.from_username}</span>
          <button onClick={() => handleAcceptRequest(req.id)}>Accept</button>
        </div>
      ))}

      <h2>Friends ({friends.length})</h2>
      {friends.map(friend => (
        <div key={friend.userID}>{friend.username}</div>
      ))}
    </div>
  );
}
```

## API Gateway Configuration

If using an API gateway (like Kong, Nginx, or AWS API Gateway), configure routes:

### Nginx Example
```nginx
# Route /api/friends/* to friend-service
location /api/friends {
    rewrite ^/api/friends/(.*) /$1 break;
    proxy_pass http://friend-service:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### Express Gateway Example
```javascript
app.use('/api/friends/users', proxy('http://localhost:3001/users'));
app.use('/api/friends/friendships', proxy('http://localhost:3001/friendships'));
app.use('/api/friends/requests', proxy('http://localhost:3001/requests'));
```

## CORS Configuration

The friend-service has CORS enabled by default. For production, you may want to restrict origins:

In `friend-service/src/server.js`, modify:
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

Then set in `.env`:
```env
ALLOWED_ORIGINS=https://yourgame.com,https://www.yourgame.com
```

## Authentication Integration

To add authentication, create middleware in `friend-service/src/middleware/auth.js`:

```javascript
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Verify token with your auth service
    const decoded = await verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticateUser };
```

Apply to routes:
```javascript
const { authenticateUser } = require('./middleware/auth');

app.use('/friendships', authenticateUser, friendshipsRouter);
app.use('/requests', authenticateUser, requestsRouter);
```

## Database Setup

### PostgreSQL Setup Script
```sql
-- Create database
CREATE DATABASE dinosaur_game;

-- Create user (optional)
CREATE USER game_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE dinosaur_game TO game_user;
```

The service will automatically create tables on first run.

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/server.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  friend-service:
    build: ./friend-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - PGHOST=postgres
      - PGUSER=postgres
      - PGPASSWORD=password
      - PGDATABASE=dinosaur_game
    depends_on:
      - postgres
    
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dinosaur_game
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Testing the Service

### Using curl
```bash
# Health check
curl http://localhost:3001/healthz

# Create a user
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"username":"player1"}'

# List users
curl http://localhost:3001/users

# Send friend request
curl -X POST http://localhost:3001/requests \
  -H "Content-Type: application/json" \
  -d '{"fromUserID":1,"toUserID":2}'

# Get incoming requests
curl http://localhost:3001/requests/incoming/2

# Accept request
curl -X PUT http://localhost:3001/requests/1/accept

# Get friends
curl http://localhost:3001/friendships/1
```

## Monitoring & Logging

Add application monitoring:

```javascript
// In server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    userId: req.userId,
    ip: req.ip
  });
  next();
});
```

## Performance Considerations

1. **Connection Pooling**: Already configured (default: 10 connections)
2. **Indexes**: Automatically created on foreign keys
3. **Pagination**: Add to GET endpoints for large datasets
4. **Caching**: Consider Redis for frequently accessed data

Example Redis caching:
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getFriendsWithCache(userId) {
  const cached = await client.get(`friends:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const friends = await getFriendsFromDB(userId);
  await client.setex(`friends:${userId}`, 300, JSON.stringify(friends)); // 5 min cache
  return friends;
}
```

## Next Steps

1. Set up PostgreSQL database
2. Configure environment variables
3. Start the friend-service
4. Integrate with your frontend
5. Add authentication middleware
6. Set up monitoring and logging
7. Deploy to production

For questions or issues, refer to the main README.md in the friend-service directory.
