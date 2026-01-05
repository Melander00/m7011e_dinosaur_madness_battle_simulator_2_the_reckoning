import { Counter, Gauge, Histogram, register } from "prom-client";
import { getAmountInQueue } from "../services/matchmaking-service";

const SERVICE_NAME = "matchmaking"

export async function getMetrics() {
    playersInQueue.set(await getAmountInQueue())
    return {
        metrics: await register.metrics(),
        contentType: register.contentType,
    }
}


const requestCount = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "endpoint", "status", "service"]
})

export type PromProps = {
    method: string,
    endpoint: string,
}

export function incRequestCount(status: number, {
    method,
    endpoint,
}: PromProps) {
    requestCount.inc({
        method,
        endpoint,
        status,
        service: SERVICE_NAME
    })
}




const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'endpoint', 'service']
});

export function createRequestDuration({
    method,
    endpoint
}: PromProps) {
    const start = Date.now()

    return {
        end: () => {
            const time = (Date.now() - start) / 1000

            requestDuration.observe({
                method,
                endpoint,
                service: SERVICE_NAME,
            }, time)
        }
    }
}


const playersInQueue = new Gauge({
    name: "players_in_queue",
    help: "Number of players in a matchmaking queue.",
    labelNames: ["service"]
})

export function incActiveMatches() {
    playersInQueue.inc({
        service: SERVICE_NAME
    })
}

export function decActiveMatches() {
    playersInQueue.dec({
        service: SERVICE_NAME
    })
}