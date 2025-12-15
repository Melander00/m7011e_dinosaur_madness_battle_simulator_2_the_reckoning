require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initializeSchema } = require('../../shared/db');

const usersRouter = require('../../user-service/routes/users');
const friendshipsRouter = require('./routes/friendships');
const requestsRouter = require('./routes/requests');

const app = express();

// Configuration
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'friend-service',
    timestamp: new Date().toISOString() 
  });
});

// API Routes
app.use('/users', usersRouter);
app.use('/friendships', friendshipsRouter);
app.use('/requests', requestsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'friend-service',
    version: '1.0.0',
    endpoints: {
      users: {
        'GET /users': 'List all users (query: ?search=username&limit=50)',
        'GET /users/:id': 'Get specific user',
        'POST /users': 'Create new user',
        'PUT /users/:id': 'Update user',
        'DELETE /users/:id': 'Delete user'
      },
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
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
async function start() {
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
