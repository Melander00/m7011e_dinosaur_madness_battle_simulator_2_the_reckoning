import bodyParser from "body-parser";
import console from "console";
import cors from "cors";
import { randomUUID } from "crypto";
import "dotenv/config";
import express from "express";
import { requireAuth } from "./auth/keycloak";
import { redis } from "./db/redis";
import { createGameServer, removeServerById, waitForServer } from "./k8s/kubernetes";
import { consume, rabbitmq } from "./messaging/rabbitmq";

const app = express();

app.listen(8080, () => {
    console.log("Listening on port 8080");
});

app.use(bodyParser.json());
app.use(cors());

const DOMAIN = process.env["GAME_SERVER_DOMAIN"] || "game.ltu-m7011e-1.se"
const NAMESPACE = process.env["GAME_SERVER_NAMESPACE"] || "game-servers"



type CreateMatchMessage = {
    user1: string;
    user2: string;
};

const createConsumer = consume("create-match", (msg: CreateMatchMessage) => {
    createServer(msg)
});

const TTL = 600

async function createServer(msg: CreateMatchMessage) {
    console.log("Starting Server")
    console.time("time")
    
    const server = await createGameServer({
        domain: DOMAIN,
        namespace: NAMESPACE,
        user1: msg.user1,
        user2: msg.user2,
        matchId: randomUUID()
    })

    await redis.set(
        `GAME_SERVER:${server.id}`,
        JSON.stringify({
            id: server.id,
            namespace: server.namespace,
            domain: server.domain,
            users: [msg.user1, msg.user2],
            expiresAt: Date.now() + TTL * 1000
        })
    )

    await redis.set(
        `USER_ACTIVE_MATCH:${msg.user1}`,
        server.id,
        {
            expiration: {
                type: "EX",
                value: TTL
            }
        }
    )

    await redis.set(
        `USER_ACTIVE_MATCH:${msg.user2}`,
        server.id,
        {
            expiration: {
                type: "EX",
                value: TTL
            }
        }
    )

    console.log("Pods Started", server.domain)
    
    try {
        await waitForServer(server)
    } catch(err) {
        // console.error("Waiting error", err)
    }

    console.log("Pods Ready")

    console.timeEnd("time")
}

const completeConsumer = rabbitmq.createConsumer(
    {
        queue: "match-completed",
        queueOptions: {
            durable: true,
        },
        exchanges: [
            {
                exchange: "match-events",
                type: "topic",
            },
        ],
        queueBindings: [
            {
                exchange: "match-events",
                routingKey: "match.completed",
            },
        ],
    },
    async (msg) => {
        console.log(msg)
    }
);

app.get("/match", requireAuth, async (req, res) => {
    
    const user = req.user;
    const userId = user.sub;
    
    if (!userId) {
        res.status(500).send("Userid is null for some reason");
        return;
    }
    
    const matchId = await redis.get(`USER_ACTIVE_MATCH:${userId}`)
    if(!matchId) {
        res.status(400).send("You dont have an active match.");
        return;
    }
    console.log("Has match %o", matchId)
    
    const serverDataRaw = await redis.get(`GAME_SERVER:${matchId}`);
    if (!serverDataRaw) {
        res.status(500).send("Match exists but server data is missing");
        return 
    }
    console.log("found match %o", serverDataRaw)
    
    const serverData = JSON.parse(serverDataRaw);

    console.log("decoded match %o", serverData)
    
    res.json({
        domain: serverData.domain
    })
});

app.get("/:matchId", async (req, res) => {
    const matchId = req.params.matchId
    const serverDataRaw = await redis.get(`GAME_SERVER:${matchId}`);
    if (!serverDataRaw) {
        return res.status(500).send("Match exists but server data is missing");
    }

    const serverData = JSON.parse(serverDataRaw);
    res.json(serverData)
});

async function removeExpiredMatches() {
    console.log("Removing expired matches")

    const keys = await redis.keys("GAME_SERVER:*")
    const now = Date.now()

    const expiredServers: any[] = []

    for(const key of keys) {
        const json = await redis.get(key)
        if(!json) continue;
        const data = JSON.parse(json)
        if(!data.expiresAt) {
            continue;
        }

        if(parseInt(data.expiresAt) < now) {
            console.log(data)
            expiredServers.push({...data, key})
        }
    }
    
    expiredServers.forEach((m) => {
        console.log(m.id, m.namespace)
        removeServerById(m.id, m.namespace)
        redis.del(m.key)
    })

}
removeExpiredMatches()
const interval = setInterval(removeExpiredMatches, 1000 * 60)

async function onShutdown() {
    clearInterval(interval)
    await completeConsumer.close()
    await createConsumer.close();
    await rabbitmq.close();
}

process.on("SIGINT", onShutdown);
process.on("SIGTERM", onShutdown);
