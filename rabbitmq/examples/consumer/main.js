const { Connection } = require("rabbitmq-client")

const RABBITMQ_HOST = "amqp://admin:admin123@localhost:5672"

const rabbit = new Connection(RABBITMQ_HOST)

rabbit.on("error", err => {
    console.error(`RabbitMQ Error: ${err}`)
})


rabbit.on("connection", err => {
    console.log("RabbitMQ connection (re)established")
})


const consumer = rabbit.createConsumer({
    queue: "test-queue",
    queueOptions: {
        durable: true,
    },
    qos: {
        prefetchCount: 1
    },
    exchanges: [{exchange: 'test-events', type: 'topic'}],
    // With a "topic" exchange, messages matching this pattern are routed to the queue
    queueBindings: [{exchange: 'test-events', routingKey: 'test.*'}],
}, async (msg) => {
    await delay(70)
    console.log("Consumed: %o", msg)
})

async function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {resolve()}, ms)
    })
}

consumer.on("error", err => {
    console.error(`Consumer Error: ${err}`)
})

async function onShutdown() {
    await consumer.close()
    await rabbit.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)