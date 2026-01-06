import { createClient, SetOptions } from "redis";

const USERNAME = process.env["REDIS_USERNAME"] || "";
const PASSWORD = process.env["REDIS_PASSWORD"] || "";
const HOST = process.env["REDIS_HOST"] || "localhost";
const PORT = process.env["REDIS_PORT"] || "6379";
const DB = process.env["REDIS_DB"] || "";

const REDIS_URL = `redis://${USERNAME ? `${USERNAME}:${PASSWORD}@` : ""}${HOST}:${PORT}${DB ? `/${DB}` : ""}`;

const client = createClient({
  url: REDIS_URL,
});

client.on("error", (err) => console.log("[friend-service] Redis Error:", err));
client.on("connect", () => console.log("[friend-service] Redis Connected"));

let redis: typeof client | undefined = undefined;

export async function initRedis() {
  if (client.isOpen) {
    return client;
  }

  await client.connect();
  redis = client;
  return client;
}

export async function closeRedis() {
  if (redis?.isOpen) {
    await redis.quit();
    redis = undefined;
    console.log("[friend-service] Redis connection closed");
  }
}

export function getRedisClient() {
  return redis;
}
