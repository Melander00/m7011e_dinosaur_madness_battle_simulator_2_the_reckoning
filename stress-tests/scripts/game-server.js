const { initRabbit } = require("../helper/rabbit");
const { randomUUID } = require("node:crypto")

const BATCHES = 4;
const MATCH_PER_BATCH = 10;
const DELAY_BETWEEN_BATCHES_MS = 15000;
const DELAY_BETWEEN_MATCHES_MS = 100;

function uuid() {
    return randomUUID()
}

let intervalId = -1;

async function begin() {
    const {createPublisher} = await initRabbit()

    const pub = createPublisher({
        exchanges: [{
            exchange: "match-events",
            type: "topic"
        }],
        confirm: true,
        maxAttempts: 5,
    })

    async function startMatch() {
        await pub.send({
            exchange: "match-events",
            routingKey: "match.create.new"
        }, {
            user1: uuid(),
            user2: uuid(),
            ranked: false,
        })
    }

    let loops = 0;

    async function batch() {
        loops++;
        console.log("Batch %o", loops)
        for(let i = 0; i < MATCH_PER_BATCH; i++) {
            console.log("Match %o", i+1)
            startMatch()
            await delay(DELAY_BETWEEN_MATCHES_MS)
        }

        if(loops < BATCHES) {
            setTimeout(batch, DELAY_BETWEEN_BATCHES_MS)
        } else {
            process.exit()
        }
    }
    
    batch()
}

begin()

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, ms)
    })
}

process.on("SIGINT", () => {
    clearInterval(intervalId)
})

process.on("SIGTERM", () => {
    clearInterval(intervalId)
})