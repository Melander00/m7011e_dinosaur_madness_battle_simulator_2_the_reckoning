const { Connection } = require("rabbitmq-client")

const USERNAME = process.env["RABBITMQ_USERNAME"] || ""
const PASSWORD = process.env["RABBITMQ_PASSWORD"] || ""
const HOST = process.env["RABBITMQ_HOST"] || "localhost"
const PORT = process.env["RABBITMQ_PORT"] || "5672"

const RABBITMQ_URL = `amqp://${USERNAME ? `${USERNAME}:${PASSWORD}@` : ""}${HOST}:${PORT}`

const rabbit = new Connection(RABBITMQ_URL)

rabbit.on("error", err => {
    console.error(`RabbitMQ Error: ${err}`)
})


rabbit.on("connection", () => {
    console.log("RabbitMQ connection (re)established")
})

module.exports = {
    rabbitmq: rabbit
}
