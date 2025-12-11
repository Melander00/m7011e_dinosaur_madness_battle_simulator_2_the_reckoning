
import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./prisma/prisma";
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

// Get user's ELO score - protected endpoint
app.get("/elo/:userId", requireAuth, async (req, res) => {
    const user = await prisma.rankedUser.findFirst({
        where: {
            userId: req.params.userId
        }
    })

    if(!user) {
        res.status(404).send("User not found")
        return;
    }

    res.json(user)
})

app.get("/", (req, res) => {
    res.json({git: "hub5"})
})