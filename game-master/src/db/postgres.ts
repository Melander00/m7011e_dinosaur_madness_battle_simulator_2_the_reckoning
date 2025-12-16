import { Client } from "pg";

const client = new Client({
    user: process.env["DB_USER"],
    password: process.env["DB_PASSWORD"],
    host: "localhost",
    database: process.env["DATABASE"]
})

export async function db() {
    await client.connect()
    return client;
}