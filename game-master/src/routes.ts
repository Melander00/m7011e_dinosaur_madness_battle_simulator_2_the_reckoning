import type { Express } from "express";
import { requireAuth } from "./auth/keycloak";
import { getMatchById, getUserActiveMatch } from "./db/redis";
import { createRequestDuration, getMetrics, incRequestCount, PromProps } from "./monitoring/prometheus";

export function initRoutes(app: Express) {
    app.get("/metrics", async (req, res) => {
        const data = await getMetrics()
        res.set("Content-Type", data.contentType)
        res.end(data.metrics)
    })

    app.get("/match", requireAuth, async (req, res) => {

        const props: PromProps = {
            method: "GET",
            endpoint: "/match",
        }

        const dur = createRequestDuration(props)
        
        const user = req.user;
        const userId = user.sub;
        
        if (!userId) {
            incRequestCount(500, props)
            res.status(500).send("Userid is null for some reason");
            return;
        }
        
        const matchId = await getUserActiveMatch(userId)
        if(!matchId) {
            incRequestCount(400, props)
            res.status(400).send("You dont have an active match.");
            return;
        }
        
        const serverData = await getMatchById(matchId);
        if (!serverData) {
            incRequestCount(500, props)
            res.status(500).send("Match exists but server data is missing");
            return 
        }

        dur.end()
        incRequestCount(200, props)
        
        res.json({
            domain: serverData.domain,
            subpath: serverData.subpath
        })
    });
}