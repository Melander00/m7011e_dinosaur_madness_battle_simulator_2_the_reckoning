require("dotenv").config()
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

const con = rabbit.createConsumer({
    queue: "complete-match",
    queueOptions: {
        durable: true
    },
    qos: {
        prefetchCount: 1
    },
    exchanges: [{
        exchange: "match-events",
        type: "topic"
    }],
    queueBindings: [{
        exchange: "match-events",
        routingKey: "match.result.*"
    }],
}, msg => {
    console.log(msg.body)
})

const pub = rabbit.createPublisher({
    confirm: true,
    maxAttempts: 5,
})


const id = "d62f3616-83be-4cc9-b31b-4e2ed4e9b390" // U: kent, P: åke
const aId = "7847279b-2dd7-415f-a43b-9edb4d5d322b" // U: a, P: a

const aToken = `

eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJpQ2JLcmFKMnQ4ZmY1WjUzbkpHMHFHRjY3UnZvbS1iWWgtb01Mc1FDSGJrIn0.eyJleHAiOjE3NjU5ODI2NjYsImlhdCI6MTc2NTk2NDY2NiwiYXV0aF90aW1lIjoxNzY1OTY0NjY2LCJqdGkiOiI3MjgzYWY3My05OGU0LTQ5MTItYjJmZi1iNTI5NjY5NzE4MzgiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLmx0dS1tNzAxMWUtMS5zZS9yZWFsbXMvbXlhcHAiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiNzg0NzI3OWItMmRkNy00MTVmLWE0M2ItOWVkYjRkNWQzMjJiIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktZnJvbnRlbmQtYXBwIiwibm9uY2UiOiJhYTg0YTUzYi04ZGJlLTRlYjMtYWRmZC03MmY0ZDYyZTVmODEiLCJzZXNzaW9uX3N0YXRlIjoiMzMyMWQ4ZmYtMjE4NC00MTM0LWFkMGYtZTRhYzI2YzBlNDQ1IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2x0dS1tNzAxMWUtMS5zZSIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtbXlhcHAiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiMzMyMWQ4ZmYtMjE4NC00MTM0LWFkMGYtZTRhYzI2YzBlNDQ1IiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoiYSBhIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiYSIsImdpdmVuX25hbWUiOiJhIiwiZmFtaWx5X25hbWUiOiJhIiwiZW1haWwiOiJhQGEuY29tIn0.j6L9sb5ZjL9IrGlKI6tS3ndHsaRwJCPRazCUEX-m6Bp6HB-I_D26MsUWCXxrtBgFEmU9PXPLdNl08A_1UYHYATjq41JM85a-J0jMS5R8ByAIb00FxTpoXyHxmqFDLqfQDIXGuSu_jy0wXTp0RwfdM7RO8D7qKliXdyLStMuwMPtEWppO1KQ4-FKtHV0AsvTPfH6pzzBjCn1-fW9ctL2zdqflH2k2bVB5Ply1nHoiEgVIYgR5VKgQi3PCj8s79M6aIoYTeoIbpym0Ydg4x7rzoVfZQTX70bzBxi-M1hygTfHTSl0JKisdW3p7xCbXJ5CyUMHZ8OgEi1dYMiRqQvJPZg

`.replaceAll("\n", "")

const token = `

eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJpQ2JLcmFKMnQ4ZmY1WjUzbkpHMHFHRjY3UnZvbS1iWWgtb01Mc1FDSGJrIn0.eyJleHAiOjE3NjU5ODI4MTMsImlhdCI6MTc2NTk2NDgxMywiYXV0aF90aW1lIjoxNzY1OTY0ODEzLCJqdGkiOiJjMzFkYTRiYS00M2U3LTQ0M2ItOTM4Zi02YTJiNDc0NzYzZjYiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLmx0dS1tNzAxMWUtMS5zZS9yZWFsbXMvbXlhcHAiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZDYyZjM2MTYtODNiZS00Y2M5LWIzMWItNGUyZWQ0ZTliMzkwIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktZnJvbnRlbmQtYXBwIiwibm9uY2UiOiI1ZTc1N2Q3Ni04MDBmLTRjYzYtODNkYy03YzYyYzgyNDhlZWQiLCJzZXNzaW9uX3N0YXRlIjoiZGVkYjMzYmItMzk0ZC00YTYwLWI0YzMtOTkyMTlmZjRhMmJkIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2x0dS1tNzAxMWUtMS5zZSIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtbXlhcHAiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiZGVkYjMzYmItMzk0ZC00YTYwLWI0YzMtOTkyMTlmZjRhMmJkIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoia2VudCDDpWtlIDIiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJrZW50IiwiZ2l2ZW5fbmFtZSI6ImtlbnQiLCJmYW1pbHlfbmFtZSI6IsOla2UgMiIsImVtYWlsIjoia2VudC3DpWtlQGhvdG1hbGVzLmNvbSJ9.yHyFcrhlLXCuGAWWFydVJhpQiYER-3U4v2R27F5b7aMz6DnTxSeXbqlWLBnj8fDVti-8Vgdv5ev_znqia2hxa9QvqKbRXU_ZUoU8MrFzU0tCbHHlC4g6SDZgodPXP-eFCo0nnwwULDWV3dWJOGhRwhou4DYUVvIEtN74CWLtNwps3VxnOi9rwgI3tsBsELsRG5neZfb3wrV3-W936mKCQ5Ru8McgltBw47I9Bce8m4LXq6yqnLfqYakKCQPoBLHSt9ZUV7_RebNNPZF549qpEWm8_AoVyEC4O-OpHacJ2ey0oY7_eDMVwJMOdzbWrmzlhQhbQ_Lg7ClEyZW7jmB9AA

`.replaceAll("\n", "")

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {resolve()}, ms)
    })
}

async function f() {

    await pub.send("create-match", {user1: aId, user2: id, ranked: true})
    await pub.close()

    await delay(1000)

    console.log("fetch")

    const res = await fetch("http://localhost:8080/match", {
        headers: {
            "Authorization": "Bearer " + token
        }
    })

    if(res.ok) {
        const json = await res.json()
        console.log(json)
    } else {
        console.error(res.status, res.statusText)
    }



    // process.exit()
}

try {
    f()
} catch {

}

async function onShutdown() {
    await con.close()
    await rabbit.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)