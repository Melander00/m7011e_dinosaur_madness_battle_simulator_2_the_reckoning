import { Counter, Gauge, Histogram, register } from "prom-client";

const SERVICE_NAME = "game-master"

export async function getMetrics() {
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


const matchesCreated = new Counter({
    name: "matches_created_total",
    help: "Total number of matches created.",
    labelNames: ["service"]
})

export function incMatches() {
    matchesCreated.inc({
        service: SERVICE_NAME
    })
}

const activeMatches = new Gauge({
    name: "active_matches",
    help: "Number of currently active matches",
    labelNames: ["service"]
})

export function incActiveMatches() {
    activeMatches.inc({
        service: SERVICE_NAME
    })
}

export function decActiveMatches() {
    activeMatches.dec({
        service: SERVICE_NAME
    })
}

const matchStartTime = new Histogram({
    name: "matches_created_duration_seconds",
    help: "Match create time in seconds.",
    labelNames: ["service"]
})

export function createMatchDuration() {
    const start = Date.now()

    return {
        end: () => {
            const time = (Date.now() - start) / 1000

            matchStartTime.observe({
                service: SERVICE_NAME,
            }, time)
        }
    }
}
