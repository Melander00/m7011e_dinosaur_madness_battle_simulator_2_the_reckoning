import type { V1Service } from "@kubernetes/client-node"

type ServiceManifestOptions = {
    matchId: string,
}

export function createServiceManifest({
    matchId
}: ServiceManifestOptions): V1Service {
    return {
        metadata: {
            name: `match-${matchId}-svc`,
            labels: {
                app: "game-server",
                matchId
            }
        },
        spec: {
            selector: {
                matchId
            },
            ports: [{
                port: 3000,
                targetPort: 3000,
            }]
        }
    }
}