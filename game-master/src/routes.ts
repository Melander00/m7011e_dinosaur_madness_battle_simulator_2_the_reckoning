import type { Express } from "express";
import { requireAuth } from "./auth/keycloak";
import { getMatchById, getUserActiveMatch } from "./db/redis";

export function initRoutes(app: Express) {
    app.get("/match", requireAuth, async (req, res) => {
        
        const user = req.user;
        const userId = user.sub;
        
        if (!userId) {
            res.status(500).send("Userid is null for some reason");
            return;
        }
        
        const matchId = await getUserActiveMatch(userId)
        if(!matchId) {
            res.status(400).send("You dont have an active match.");
            return;
        }
        
        const serverData = await getMatchById(matchId);
        if (!serverData) {
            res.status(500).send("Match exists but server data is missing");
            return 
        }
        
        res.json({
            domain: serverData.domain
        })
    });
}