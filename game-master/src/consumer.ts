import Connection, { ConsumerStatus } from "rabbitmq-client";
import { getMatchById, removeMatchById, resetUsers } from "./db/redis";
import { startGameServer } from "./game/server";
import { removeServerById } from "./k8s/kubernetes";
import { delay } from "./lib/delay";
import { decActiveMatches, incActiveMatches } from "./monitoring/prometheus";

type CreateMatchMessage = {
    user1: string;
    user2: string;
    ranked?: boolean;
};

export function initConsumers(rabbitmq: Connection) {
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


    return async () => {
        await createMatchConsumer.close()
        await completedMatchConsumer.close()
        await rabbitmq.close()
    }
}

export async function removeFinishedMatch(matchId: string) {
    const data = await getMatchById(matchId)
    if(!data) return;
    await removeServerById(data.matchId, data.namespace)
    await removeMatchById(matchId)
    await resetUsers(data.userIds)
}