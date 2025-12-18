import { createClient, SetOptions } from "redis";
import { StoredGameServer } from "../game/server";

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

let redis: typeof client | undefined = undefined;

export async function initRedis() {
    if(client.isOpen) {
        return client;
    }

    await client.connect()
    redis = client;
    return client;
}

// const redis = client;


const MATCH_TTL = 600;
const USER_ACTIVE_MATCH = (id:string) => `USER_ACTIVE_MATCH:${id}`

export async function getUserActiveMatch(userId: string) {
    return redis?.get(USER_ACTIVE_MATCH(userId))
}

export async function setUserActiveMatch(userId: string, matchId: string, options?: SetOptions | undefined) {
    await redis?.set(USER_ACTIVE_MATCH(userId), matchId, {
        expiration: {
            type: "EX",
            value: MATCH_TTL
        },
        ...options
    })
}

const MATCH = (id: string) => `GAME_SERVER:${id}`

export async function getMatchById(matchId: string): Promise<StoredGameServer | null> {
    const data = await redis?.get(MATCH(matchId))
    if(!data) return null;
    return JSON.parse(data) as StoredGameServer
}

export async function storeMatch(server: StoredGameServer, options?: SetOptions | undefined) {
    server.expiresAt = Date.now() + MATCH_TTL * 1000;
    await redis?.set(MATCH(server.matchId), JSON.stringify(server), {
        ...options,
    })
}

export async function handleExpiredMatches(consumer: (server: StoredGameServer) => void) {
    const keys = await redis?.keys(MATCH("*"))
    const now = Date.now()

    const expiredServers: any[] = []

    for(const key of keys ?? []) {
        const json = await redis?.get(key)
        if(!json) continue;
        const data = JSON.parse(json)
        if(!data.expiresAt) {
            continue;
        }

        if(parseInt(data.expiresAt) < now) {
            expiredServers.push({...data, key})
        }
    }
    
    expiredServers.forEach((m) => {
        consumer(m)
        redis?.del(m.key)
    })
}

export async function removeMatchById(matchId: string) {
    await redis?.del(MATCH(matchId))
}

export async function resetUsers(users: string[]) {
    users.forEach((u) => {
        redis?.del(USER_ACTIVE_MATCH(u))
    })
}