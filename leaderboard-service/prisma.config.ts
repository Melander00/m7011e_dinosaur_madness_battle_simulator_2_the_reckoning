import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: path.join("prisma"),
    migrations: {
        path: path.join("prisma", "migrations"),
        seed: path.join("prisma", "seed.ts")
    },
    views: {
        path: path.join("prisma", "views"),
    },
    typedSql: {
        path: path.join("prisma", "queries"),
    },
    engine: "classic",
    datasource: {
        url: env("DATABASE_URL"),
    },
});
