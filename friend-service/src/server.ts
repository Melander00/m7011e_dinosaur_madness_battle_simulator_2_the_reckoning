import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { initializeSchema } from '../../shared/db/index';

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
app.get('/healthz', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'friend-service',
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
        'POST /friendships': 'Create friendship (body: {userID1, userID2})',
        'DELETE /friendships': 'Delete friendship (body: {userID1, userID2})'
      },
      requests: {
        'GET /requests/incoming/:userId': 'Get incoming friend requests',
        'GET /requests/outgoing/:userId': 'Get outgoing friend requests',
        'POST /requests': 'Send friend request (body: {fromUserID, toUserID})',
        'PUT /requests/:id/accept': 'Accept friend request',
        'PUT /requests/:id/reject': 'Reject friend request',
        'DELETE /requests/:id': 'Cancel friend request (body: {fromUserID})'
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

// Initialize database and start server
async function start(): Promise<void> {
  try {
    await initializeSchema('friend');
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
