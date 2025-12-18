import bodyParser from "body-parser";
import console from "console";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { ConsumerStatus } from "rabbitmq-client";
import { getMatchById, handleExpiredMatches, removeMatchById, resetUsers } from "./db/redis";
import { startGameServer } from "./game/server";
import { removeServerById } from "./k8s/kubernetes";
import { delay } from "./lib/delay";
import { rabbitmq } from "./messaging/rabbitmq";
import { decActiveMatches, incActiveMatches } from "./monitoring/prometheus";
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

    console.log("Starting new server")

    await startGameServer(user1, user2, body.ranked ?? false)

    incActiveMatches()
})

const completedMatchConsumer = rabbitmq.createConsumer({
    queue: "master-match-complete",
    queueOptions: {
        durable: true,
    },
    qos: {
        prefetchCount: 1,
    },
    exchanges: [{
        exchange: "match-events",
        type: "topic"
    }],
    queueBindings: [{
        exchange: "match-events",
        routingKey: "match.result.*"
    }]
}, async (msg) => {
    const body: { matchId: string } = msg.body
    console.log("Match finished, removing...")

    await delay(1000)
    await removeFinishedMatch(body.matchId)
    decActiveMatches()
})

async function removeFinishedMatch(matchId: string) {
    const data = await getMatchById(matchId)
    if(!data) return;
    await removeServerById(data.matchId, data.namespace)
    await removeMatchById(matchId)
    await resetUsers(data.userIds)
}

// TODO: Make this a CronJob on the cluster instead. 
// When replicating this we may try to remove servers multiple times
async function removeExpiredMatches() {
    await handleExpiredMatches(async expired => {
        await removeServerById(expired.matchId, expired.namespace)
        decActiveMatches()
    })
}
removeExpiredMatches()
const interval = setInterval(removeExpiredMatches, 1000 * 60)

async function onShutdown() {
    clearInterval(interval)
    await completedMatchConsumer.close()
    await createMatchConsumer.close();
    await rabbitmq.close();
}

process.on("SIGINT", onShutdown);
process.on("SIGTERM", onShutdown);
