import { Connection } from "rabbitmq-client";

const USERNAME = process.env["RABBITMQ_USERNAME"] || "";
const PASSWORD = process.env["RABBITMQ_PASSWORD"] || "";
const HOST = process.env["RABBITMQ_HOST"] || "localhost";
const PORT = process.env["RABBITMQ_PORT"] || "5672";

const RABBITMQ_URL = `amqp://${USERNAME ? `${USERNAME}:${PASSWORD}@` : ""}${HOST}:${PORT}`;

let rabbit: Connection;

export async function initRabbitMQ() {
    return new Promise<Connection>((resolve) => {

        rabbit = new Connection(RABBITMQ_URL);
        
        rabbit.on("error", (err) => {
            console.error(`RabbitMQ Error: ${err}`);
        });
        
        rabbit.on("connection", () => {
            resolve(rabbit)
            console.log("RabbitMQ connection (re)established");
        });
    })
}

export async function getRabbitMQ() {
    return rabbit;
}
