
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { query } from "./db";
import { requireAuth } from "./auth/keycloak";
import { getMetrics } from "./monitoring/prometheus";
import { startLeaderboardMatchResultConsumer } from "./rabbitmq-consumer";



import leaderboardRouter from "./routes/leaderboard";

const app = express();

// Configuration
const PORT = parseInt(process.env.PORT || "3005", 10);

// Middleware ordering (match friend-service style)
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', service: 'leaderboard-service', timestamp: new Date().toISOString() });
});

// DB connectivity check (temporary debug endpoint)
app.get('/db/ping', async (req, res, next) => {
    try {
        const result = await query('SELECT 1 as ping, NOW() as timestamp');
        res.json({
            status: 'connected',
            ping: result.rows[0].ping,
            timestamp: result.rows[0].timestamp 
        });
    } catch (err: any) {
        res.status(500).json({ 
            status: 'error', 
            error: err.message,
            detail: 'Database connection failed'
        });
    }
});

// DEV ONLY: Manual seed endpoint for testing /leaderboard/me
// Usage: POST /dev/seed-rank with body: { "userId": "your-keycloak-sub", "rankedPoints": 1500 }
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_ENDPOINTS === 'true') {
    app.post('/dev/seed-rank', async (req, res, next) => {
        try {
            const { userId, rankedPoints } = req.body;
            
            if (!userId || typeof rankedPoints !== 'number') {
                return res.status(400).json({ 
                    error: 'Invalid request',
                    required: { userId: 'string (UUID)', rankedPoints: 'number' }
                });
            }
            
            await query(
                `INSERT INTO ranks (userid, rankedpoints) 
                 VALUES ($1, $2)
                 ON CONFLICT (userid) DO UPDATE SET rankedpoints = $2`,
                [userId, rankedPoints]
            );
            
            res.json({ 
                success: true, 
                message: 'Rank seeded',
                userId,
                rankedPoints
            });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });
    
    console.log('[DEV] /dev/seed-rank endpoint enabled for manual testing');
}

app.get("/metrics", async (req, res) => {
  const data = await getMetrics();
  res.set("Content-Type", data.contentType);
  res.end(data.metrics);
});


// Routes
app.use('/leaderboard', leaderboardRouter);

// Token introspection endpoint - returns authenticated user's info from JWT (top-level for compatibility)
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

// Root endpoint
app.get('/', (req, res) => {
    res.json({ service: 'leaderboard-service', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Export app for testing
export { app };

// Start server only if not imported as module
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`leaderboard-service listening on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

        try {
            await startLeaderboardMatchResultConsumer();
            console.log("[Leaderboard Service] RabbitMQ consumer started");
        } catch (err) {
            console.error("[Leaderboard Service] Failed to start RabbitMQ consumer", err);
            process.exit(1); // Fail fast if background worker cannot start
        }
    });
}
