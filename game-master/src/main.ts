import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { requireAuth } from "./auth/keycloak";
import { redis } from "./db/redis";
import { consume, rabbitmq } from "./messaging/rabbitmq";

const app = express();

app.listen(8080, () => {
    console.log("Listening on port 8080");
});

app.use(bodyParser.json());
app.use(cors());

type CreateMatchMessage = {
    user1: string;
    user2: string;
};

const createConsumer = consume("create-match", async (msg: CreateMatchMessage) => {
    await redis.set("active", msg.user1);
});

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

    const active = await redis.get("active");
    if (active === userId) {
        res.json({ ok: true });
        return;
    }

    res.status(400).send("You dont have an active match.");
});

app.get("/id", async (req, res) => {
    const id = await redis.get("id");
    res.json({ id });
});

async function onShutdown() {
    await completeConsumer.close()
    await createConsumer.close();
    await rabbitmq.close();
}

process.on("SIGINT", onShutdown);
process.on("SIGTERM", onShutdown);
