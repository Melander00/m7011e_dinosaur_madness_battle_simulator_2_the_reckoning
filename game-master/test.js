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

eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJpQ2JLcmFKMnQ4ZmY1WjUzbkpHMHFHRjY3UnZvbS1iWWgtb01Mc1FDSGJrIn0.eyJleHAiOjE3NjU4OTc0OTMsImlhdCI6MTc2NTg3OTQ5MywiYXV0aF90aW1lIjoxNzY1ODc4NjI2LCJqdGkiOiI3N2VlMTA3Yi0xYTNmLTQ4ODAtYTQ1ZC1lYzc2MDExZDg5OGIiLCJpc3MiOiJodHRwczovL2tleWNsb2FrLmx0dS1tNzAxMWUtMS5zZS9yZWFsbXMvbXlhcHAiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZDYyZjM2MTYtODNiZS00Y2M5LWIzMWItNGUyZWQ0ZTliMzkwIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoibXktZnJvbnRlbmQtYXBwIiwibm9uY2UiOiJhNWQ1MTBiYS1hMmQ1LTQ0NzgtYjIwMS03YzFiN2JhNTNhMmIiLCJzZXNzaW9uX3N0YXRlIjoiNmM4M2IzZDgtMDY5YS00OGU3LWI3YjItN2IyMGVmYjY1ZDZlIiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2x0dS1tNzAxMWUtMS5zZSIsImh0dHA6Ly9sb2NhbGhvc3Q6NTE3MyJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiIsImRlZmF1bHQtcm9sZXMtbXlhcHAiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwic2lkIjoiNmM4M2IzZDgtMDY5YS00OGU3LWI3YjItN2IyMGVmYjY1ZDZlIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoia2VudCDDpWtlIDIiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJrZW50IiwiZ2l2ZW5fbmFtZSI6ImtlbnQiLCJmYW1pbHlfbmFtZSI6IsOla2UgMiIsImVtYWlsIjoia2VudC3DpWtlQGhvdG1hbGVzLmNvbSJ9.ELL4POhbDH1Nm07u-NZINT0PcVuw7DzWdc3mJZ7w5xXrhSosKJlwJWRU01T4Dwc1oGP1EZr-ARsEN_XowJSHdwzsgLtkG8gXaWgfgGnyoL4PCbmuqU-FXTSKTcuDwpBYTTdFLSp2FOL9vtEVjw-p5aGxrhblN2HYbWdZZf1vnAjoSiSMtJmwulS4Z7kgC-y77ubTknoTvB513wz7u3tbXDKVDo8jTWfwJN4bDJqr72stg9tO4sQ4ZkooGAmJ60I2Q3GIBonbwe37w69cBgQNEemwvgU4CD7EJVXC0Mc6f8IYbO_fGTlONtQ9XROCNGJ7R_vwVUIjMS5A76bVXnLNiA

`.replaceAll("\n", "")

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {resolve()}, ms)
    })
}

async function f() {

    await pub.send("create-match", {user1: id, user2: id})

    await delay(1000)

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

    // await delay(1000)

    // const a = await fetch("http://localhost:8080/id")
    // console.log(await a.json())
}


f()

async function onShutdown() {
    clearInterval(interval)
    await publisher.close()
    await rabbit.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)