import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { healthCheck } from './db';

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
        'GET /friendships/:userId': 'Get all friends for a user',
        'GET /friendships/:userId/count': 'Get friend count',
        'POST /friendships': 'Create friendship (body: {userId1, userId2})',
        'DELETE /friendships': 'Delete friendship (body: {userId1, userId2})'
      },
      requests: {
        'GET /requests/incoming/:userId': 'Get incoming friend requests',
        'GET /requests/outgoing/:userId': 'Get outgoing friend requests',
        'POST /requests': 'Send friend request (body: {fromUserId, toUserId})',
        'PUT /requests/accept': 'Accept friend request (body: {fromUserId, toUserId})',
        'PUT /requests/reject': 'Reject friend request (body: {fromUserId, toUserId})',
        'DELETE /requests': 'Cancel friend request (body: {fromUserId, toUserId})'
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
    app.listen(PORT, () => {
      console.log(`friend-service listening on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
