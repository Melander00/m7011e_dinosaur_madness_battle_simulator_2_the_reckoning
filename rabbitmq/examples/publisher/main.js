const { Connection } = require("rabbitmq-client")

const RABBITMQ_HOST = "amqp://admin:admin123@localhost:5672"

const rabbit = new Connection(RABBITMQ_HOST)

rabbit.on("error", err => {
    console.error(`RabbitMQ Error: ${err}`)
})


rabbit.on("connection", err => {
    console.log("RabbitMQ connection (re)established")
})


const publisher = rabbit.createPublisher({
    confirm: true,
    maxAttempts: 5,
    exchanges: [{ exchange: "test-events", type: "topic" }]
})


let id = 1;
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

async function publishRandomMessage() {
    let s = ""
    for(let i = 0; i < 8; i++) {
        s += ABC[Math.floor(Math.random() * ABC.length)]
    }
    await publisher.send('test-queue', {id: id++, name: s})
    console.log("Sent",s)
}

const interval = setInterval(publishRandomMessage, 100)


async function onShutdown() {
    clearInterval(interval)
    await publisher.close()
    await rabbit.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)