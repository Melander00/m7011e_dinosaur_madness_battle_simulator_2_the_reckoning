import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { healthCheck } from './db';

import usersRouter from './routes/users';

const app = express();

// Configuration
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/healthz', async (req: Request, res: Response) => {
  const dbHealth = await healthCheck();
  res.json({ 
    status: dbHealth.status === 'healthy' ? 'ok' : 'degraded', 
    service: 'user-service',
    database: dbHealth,
    timestamp: new Date().toISOString() 
  });
});

// API Routes
app.use('/users', usersRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'user-service',
    version: '1.0.0',
    endpoints: {
      users: {
        'GET /users': 'List all users (query: ?search=username&limit=50)',
        'GET /users/:id': 'Get specific user by UUID',
        'POST /users': 'Create new user',
        'PUT /users/:id': 'Update user',
        'DELETE /users/:id': 'Delete user'
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
      console.log(`user-service listening on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
