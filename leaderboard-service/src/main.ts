
import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireAuth } from "../../shared/auth/keycloak";

const app = express();

// Configure CORS to allow requests from frontend
app.use(cors({
    origin: [
        'http://localhost:5173',  // Vite dev server
        'https://ltu-m7011e-1.se' // Production frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

const PORT = parseInt(process.env["PORT"] || "3005")

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})

// Get authenticated user's ELO score - protected endpoint
// SECURITY: Uses sub claim from validated JWT, not URL parameter
app.get("/elo/me", requireAuth, async (req, res) => {
    const userId = req.userId; // Using convenience accessor from middleware
    
    if (!userId) {
        return res.status(500).json({ error: "User ID not found in token" });
    }
    
    // TODO: Replace with your database implementation
    // Query database using userId (Keycloak sub claim)
    res.status(200).json({
        userId,
        elo: 1500,
        message: "Database integration pending"
    })
})

// Token introspection endpoint - returns authenticated user's info from JWT
app.get("/me", requireAuth, (req, res) => {
    res.status(200).json({
        sub: req.userId,
        email: req.user?.email,
        username: req.user?.preferred_username,
        name: req.user?.name,
        roles: req.user?.realm_access?.roles || [],
        emailVerified: req.user?.email_verified
    })
})

app.get("/", (req, res) => {
    res.json({git: "hub5"})
})