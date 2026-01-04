require("dotenv").config()
const { Connection, Consumer, ConsumerProps, ConsumerHandler, PublisherProps, Publisher } = require("rabbitmq-client")


const USERNAME = process.env["RABBITMQ_USERNAME"] || "";
const PASSWORD = process.env["RABBITMQ_PASSWORD"] || "";
const HOST = process.env["RABBITMQ_HOST"] || "localhost";
const PORT = process.env["RABBITMQ_PORT"] || "5672";

const RABBITMQ_URL = `amqp://${USERNAME ? `${USERNAME}:${PASSWORD}@` : ""}${HOST}:${PORT}`;

let channels = []

/** @type {Connection} */
let rabbit = null;

/**
 * 
 * @returns {Promise<{createPublisher: (props: PublisherProps) => Publisher, createConsumer: (props: ConsumerProps, cb: ConsumerHandler) => Consumer}>}
 */
async function initRabbit() {
    return new Promise((resolve) => {


        rabbit = new Connection(RABBITMQ_URL);

        rabbit.on("error", (err) => {
            console.error(`RabbitMQ Error: ${err}`);
        });

        rabbit.on("connection", () => {
            console.log("RabbitMQ connection (re)established");

            /**
             * 
             * @param  {rabbitmq.ConsumerProps} props 
             * @param {rabbitmq.ConsumerHandler} cb
             */
            function createConsumer(props, cb) {
                const c = rabbit.createConsumer(props, cb)
                channels.push(c)
                return c;
            }

            /**
             * 
             * @param {rabbitmq.PublisherProps} props 
             */
            function createPublisher(props) {
                const c = rabbit.createPublisher(props)
                channels.push(c)
                return c;
            }

            resolve({
                createConsumer,
                createPublisher
            })
        });



    })

}


module.exports = {
    initRabbit
}

async function stop() {
    for (let i = 0; i < channels.length; i++) {
        await channels[i].close()
    }
    await rabbit.close()
}

process.on("SIGINT", stop)
process.on("SIGTERM", stop)