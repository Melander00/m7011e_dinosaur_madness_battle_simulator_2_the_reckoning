import "dotenv/config";
import { createApp } from "./app";
import { initConsumers } from "./consumer";
import { initRedis } from "./db/redis";
import { beginWatchingForExpiredMatches } from "./expiryHandler";
import { initRabbitMQ } from "./messaging/rabbitmq";


async function init() {
    await initRedis()
    const rabbit = await initRabbitMQ()

    // REST API
    createApp()

    // Init RabbitMQ Consumers
    const closeConsumers = initConsumers(rabbit)

    // Watch redis for matches that are expired.
    const stopWatching = beginWatchingForExpiredMatches()
    
    async function onShutdown() {
    
        await stopWatching()
        await closeConsumers()
    }

    process.on("SIGINT", onShutdown);
    process.on("SIGTERM", onShutdown);
}

init()

