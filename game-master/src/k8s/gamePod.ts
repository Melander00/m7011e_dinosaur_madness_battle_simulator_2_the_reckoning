import type { V1Pod } from "@kubernetes/client-node"

type PodManifestOptions = {
    matchId: string,
    user1: string,
    user2: string,
    ranked: boolean,
}

export function createPodManifest({
    matchId,
    user1,
    user2,
    ranked
}: PodManifestOptions): V1Pod {
    return {
        metadata: {
            name: `match-${matchId}`,
            labels: {
                app: "game-server",
                matchId,
            }
        },
        spec: {
            containers: [{
                name: "game-server",
                image: process.env["GAME_SERVER_IMAGE"],
                imagePullPolicy: "Always",
                ports: [{
                    containerPort: 3000
                }],
                env: [
                    {name: "MATCH_ID", value: matchId},
                    {name: "USER1", value: user1},
                    {name: "USER2", value: user2},
                    {name: "RANKED", value: ranked ? "1" : "0"},

                    {name: "RABBITMQ_USERNAME", value: process.env["RABBITMQ_USERNAME"]},
                    {name: "RABBITMQ_PASSWORD", value: process.env["RABBITMQ_PASSWORD"]},
                    {name: "RABBITMQ_HOST", value: "rabbitmq-service-api.rabbitmq.svc.cluster.local"},
                    {name: "RABBITMQ_PORT", value: process.env["RABBITMQ_PORT"]},
                    // {name: "RABBITMQ_USERNAME", value: process.env["RABBITMQ_USERNAME"]},
                    // {name: "RABBITMQ_PASSWORD", value: process.env["RABBITMQ_PASSWORD"]},
                    // {name: "RABBITMQ_HOST", value: process.env["RABBITMQ_HOST"]},
                    // {name: "RABBITMQ_PORT", value: process.env["RABBITMQ_PORT"]},
                ]
            }],
            restartPolicy: "Never"
        }
    }
}
/*

RABBITMQ_USERNAME="admin"
RABBITMQ_PASSWORD="admin123"
RABBITMQ_HOST="localhost"
RABBITMQ_PORT="5672"

*/