import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { healthCheck } from './db';
import { initRedis, closeRedis } from './db/redis';
import { connectRabbitMQ, closeRabbitMQ } from './messaging/rabbitmq';
import { requireAuth } from './auth/keycloak';
import { getMetrics } from './monitoring/prometheus';

import friendshipsRouter from './routes/friendships';
import requestsRouter from './routes/requests';

const app = express();

// Configuration
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/healthz', async (req: Request, res: Response) => {
  const dbHealth = await healthCheck();
  res.json({ 
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded', 
    service: 'friend-service',
    database: dbHealth,
    timestamp: new Date().toISOString() 
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  const { metrics, contentType } = await getMetrics();
  res.set('Content-Type', contentType);
  res.send(metrics);
});

// Token introspection endpoint - returns authenticated user's info from JWT
app.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    sub: req.userId,
    email: req.user?.email,
    username: req.user?.preferred_username,
    name: req.user?.name,
    roles: req.user?.realm_access?.roles || [],
    emailVerified: req.user?.email_verified,
  });
});

// API Routes
app.use('/friendships', friendshipsRouter);
app.use('/requests', requestsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'friend-service',
    version: '1.0.0',
    endpoints: {
      friendships: {
        'GET /friendships/:userId': 'Get all friends for authenticated user',
        'GET /friendships/count': 'Get friend count',
        'POST /friendships': 'Create friendship (body: {userId})',
        'DELETE /friendships/:userId': 'Delete friendship with user',
        'POST /friendships/invite': 'Send game invite to friend (body: {toUserId})',
        'GET /friendships/invite': 'Get all incoming game invites',
        'DELETE /friendships/invite/:inviteId': 'Cancel a sent game invite'
      },
      requests: {
        'GET /requests/incoming': 'Get incoming friend requests',
        'GET /requests/outgoing': 'Get outgoing friend requests',
        'POST /requests': 'Send friend request (body: {toUserId})',
        'PUT /requests/:fromUserId/accept': 'Accept friend request',
        'PUT /requests/:fromUserId/reject': 'Reject friend request',
        'DELETE /requests/:toUserId': 'Cancel friend request'
      }
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server (schema is managed by Flyway migrations)
async function start(): Promise<void> {
  try {
    // Connect to Redis (for game invites)
    await initRedis();
    
    // Connect to RabbitMQ
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`friend-service listening on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeRabbitMQ();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeRabbitMQ();
  await closeRedis();
  process.exit(0);
});

start();
