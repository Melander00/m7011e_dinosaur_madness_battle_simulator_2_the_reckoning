import { createClient } from "redis";

const USERNAME = process.env["REDIS_USERNAME"] || ""
const PASSWORD = process.env["REDIS_PASSWORD"] || ""
const HOST = process.env["REDIS_HOST"] || "localhost"
const PORT = process.env["REDIS_PORT"] || "5379"
const DB = process.env["REDIS_DB"] || ""

const REDIS_URL = `redis://${USERNAME ? `${USERNAME}:${PASSWORD}@` : ""}${HOST}:${PORT}${DB ? `/${DB}` : ""}`

const client = createClient({
    url: REDIS_URL
})

client.on("error", err => console.log("Redis Error %o", err))
client.on("connection", () => console.log("Redis Connected"))

client.connect()

export async function initRedis() {
    if(client.isOpen) {
        return client;
    }

    await client.connect()

    return client;
}

export const redis = client;