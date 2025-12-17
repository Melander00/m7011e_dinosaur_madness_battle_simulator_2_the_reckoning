import bodyParser from "body-parser";
import console from "console";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { ConsumerStatus } from "rabbitmq-client";
import { handleExpiredMatches } from "./db/redis";
import { startGameServer } from "./game/server";
import { removeServerById } from "./k8s/kubernetes";
import { rabbitmq } from "./messaging/rabbitmq";
import { initRoutes } from "./routes";


// REST API
const app = express();
app.listen(8080, () => {
    console.log("Listening on port 8080");
});
app.use(bodyParser.json());
app.use(cors());
initRoutes(app)

type CreateMatchMessage = {
    user1: string;
    user2: string;
    ranked?: boolean;
};

const createMatchConsumer = rabbitmq.createConsumer({
    queue: "create-match",
    queueOptions: {
        durable: true
    },
    qos: {
        prefetchCount: 1
    },
    exchanges: [{
        exchange: "match-events",
        type: "topic"
    }],
    queueBindings: [{
        exchange: "match-events",
        routingKey: "match.create.*"
    }],
}, async (msg) => {
    const body = msg.body as CreateMatchMessage

    const {user1, user2} = body;
    if(!user1 || !user2) {
        // NACK:requeue=false
        return ConsumerStatus.DROP 
    }

    await startGameServer(user1, user2, body.ranked ?? false)
})


// TODO: Make this a CronJob on the cluster instead. 
// When replicating this we may try to remove servers multiple times 
async function removeExpiredMatches() {
    await handleExpiredMatches(expired => {
        removeServerById(expired.matchId, expired.namespace)
    })
}
removeExpiredMatches()
const interval = setInterval(removeExpiredMatches, 1000 * 60)

async function onShutdown() {
    clearInterval(interval)
    await createMatchConsumer.close();
    await rabbitmq.close();
}

process.on("SIGINT", onShutdown);
process.on("SIGTERM", onShutdown);
