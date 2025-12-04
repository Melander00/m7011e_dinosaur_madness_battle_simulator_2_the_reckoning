const express = require("express")
const prom = require("prom-client")
const app = express()
const PORT = parseInt(process.env["PORT"] || "3000")

const { Counter, Histogram, register } = prom

const requestCount = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'endpoint', 'status', 'service']
});

const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency in seconds',
    labelNames: ['method', 'endpoint', 'service']
});

const SERVICE_NAME = "ping-service"

app.listen(PORT, () => {
    console.log("Listening on port " + PORT)
})






app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType)
    res.end(await register.metrics())
})

app.get("/ping", (req, res) => {

    const start = Date.now()

    requestCount.inc({
        method: "GET",
        endpoint: "/ping",
        status: 200,
        service: SERVICE_NAME
    })

    requestDuration.observe({}, (Date.now() - start) / 1000)

    res.send("pong")
})