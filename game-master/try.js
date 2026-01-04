require("dotenv").config()
const { Connection } = require("rabbitmq-client")

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
    queue: "leaderboard-match-history",
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

eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJpQ2JLcmFKMnQ4ZmY1WjUzbkpHMHFHRjY3UnZvbS1iWWgtb01Mc1FDSGJrIn0.eyJleHAiOjE3NjYwNjIyNzksImlhdCI6MTc2NjA0NDI3OSwiYXV0aF90aW1lIjoxNzY2MDQzNjY4LCJqdGkiOiI3ZTg5ZGMyMy1jYmYxLTQxYzQtOGNhMC1iYzRhNTQ4NzBhYjYiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLmx0dS1tNzAxMWUtMS5zZS9yZWFsbXMvbXlhcHAiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZDYyZjM2MTYtODNiZS00Y2M5LWIzMWItNGUyZWQ0ZTliMzkwIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktZnJvbnRlbmQtYXBwIiwibm9uY2UiOiI3MTRlYWNhMy1lNjc4LTQ2NmQtYjNhNy1kZDk0ZTE0MzhmNzYiLCJzZXNzaW9uX3N0YXRlIjoiNzk4NTNiN2UtMDllYi00OTgzLTllMmYtNmRjZTlmMTAzMDQyIiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2x0dS1tNzAxMWUtMS5zZSIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtbXlhcHAiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiNzk4NTNiN2UtMDllYi00OTgzLTllMmYtNmRjZTlmMTAzMDQyIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoia2VudCDDpWtlIDIiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJrZW50IiwiZ2l2ZW5fbmFtZSI6ImtlbnQiLCJmYW1pbHlfbmFtZSI6IsOla2UgMiIsImVtYWlsIjoia2VudC3DpWtlQGhvdG1hbGVzLmNvbSJ9.ner1ysOEJ6nEd7cfAREhyKGWtAIqMSnRfLwNojzl8N8tkS9fBuv6MgRw5xL7ZDuTewFdUGzpH8iuwWEMkbZEgouv_Rr2zIMsGJz7o9oAwCXUP5EKqpNTJk1pkzH7RhcvcgA-D2wE81QXtDAh6ggCHmqueH6HSZ_XWrVl-oH13rAeEAAZwyfKriUzm5-6O-imXk-tLG_JGN-DC4kjnXuufubbJ0BtnzXAJH9nTP1iZ2peg2_mSvA3T-Nl_XeZmQ2knQdUCKioYNFUZS2xPOUmwACKzlA-_q9m49zY5sNruMV2l_-pNwFBpcZIHixoPwxYpLW8d-qQ18TgzH3cRo7kDA

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