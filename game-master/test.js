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

const pub = rabbit.createPublisher({
    confirm: true,
    maxAttempts: 5,
})


const id = "d62f3616-83be-4cc9-b31b-4e2ed4e9b390"

const token = `

eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJpQ2JLcmFKMnQ4ZmY1WjUzbkpHMHFHRjY3UnZvbS1iWWgtb01Mc1FDSGJrIn0.eyJleHAiOjE3NjU5MTYwMDAsImlhdCI6MTc2NTg5ODAwMCwiYXV0aF90aW1lIjoxNzY1ODk4MDAwLCJqdGkiOiJhZWJjYjg1My01NDVhLTQzYzUtOTMwYi1kMTA3M2E1OTMyNzEiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLmx0dS1tNzAxMWUtMS5zZS9yZWFsbXMvbXlhcHAiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZDYyZjM2MTYtODNiZS00Y2M5LWIzMWItNGUyZWQ0ZTliMzkwIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktZnJvbnRlbmQtYXBwIiwibm9uY2UiOiI5YWViMzY3Mi0zMDk0LTRjMzYtYWIxNy1hNDBmNTliYmVmYzciLCJzZXNzaW9uX3N0YXRlIjoiODUxMzFiODQtOThmOS00YWNkLTkwNTMtYjU4MTk1ZmIzNGE1IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2x0dS1tNzAxMWUtMS5zZSIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtbXlhcHAiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiODUxMzFiODQtOThmOS00YWNkLTkwNTMtYjU4MTk1ZmIzNGE1IiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoia2VudCDDpWtlIDIiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJrZW50IiwiZ2l2ZW5fbmFtZSI6ImtlbnQiLCJmYW1pbHlfbmFtZSI6IsOla2UgMiIsImVtYWlsIjoia2VudC3DpWtlQGhvdG1hbGVzLmNvbSJ9.S0opPRu1Gg318QcAqzlb2W0EcrST1T-IeY2G54mBMeZvPMDJuLeYG2ha6kfE9du_wCTH4YOYL55XdLy3zoUD7oilW8cKEHET9k229fokWmaOSKlr-mtDY-dsvEpcq2fW7aUIom8YtolfHwf7u-c4Sg_WyMvHyqIm9ClYQtDQJTjMgDc35dPWsc7ssvqU0qEN6GpF1u6gfJFrfxNbFkq9h0s1KtflaD0bLAzqbaDRObCrzsyqvN3QFLrVxQuKobtes3TKv__oHHIALkgH7shKfQuOj4FTxMYk96EUxzEN13y_wicF504Ev32BHlFYY3AB3IsrUSEimTv4U06UdaLljw

`.replaceAll("\n", "")

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {resolve()}, ms)
    })
}

async function f() {

    await pub.send("create-match", {user1: id, user2: id})

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

    process.exit()
}


f()

async function onShutdown() {
    await pub.close()
    await rabbit.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)