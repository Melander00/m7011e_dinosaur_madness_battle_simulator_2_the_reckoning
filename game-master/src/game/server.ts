import { randomUUID } from "crypto"
import { setUserActiveMatch, storeMatch } from "../db/redis"
import { createGameServer, waitForServer } from "../k8s/kubernetes"
import { createMatchDuration } from "../monitoring/prometheus"

export type StoredGameServer = {
    matchId: string,
    namespace: string,
    domain: string,
    subpath: string,
    userIds: string[],
    expiresAt: number,
    ranked: boolean,
}
const DOMAIN = process.env["GAME_SERVER_DOMAIN"] || "{ID}.ltu-m7011e-1.se"
const SUBPATH = process.env["GAME_SERVER_SUBPATH"] || ""
const NAMESPACE = process.env["GAME_SERVER_NAMESPACE"] || "game-servers"

export function startGameServer(user1: string, user2: string, ranked: boolean) {
    const dur = createMatchDuration()

    const matchId = randomUUID()
    
    return new Promise<void>(async (resolve) => {
        const server = await createGameServer({
            domain: DOMAIN.replace("{ID}", matchId),
            namespace: NAMESPACE,
            user1: user1,
            user2: user2,
            matchId: matchId,
            ranked: ranked,
            subpath: SUBPATH.replace("{ID}", matchId),
        })
        
        await storeMatch({
            matchId: server.matchId,
            namespace: server.namespace,
            domain: server.domain,
            subpath: server.subpath,
            userIds: [user1, user2],
            expiresAt: 0,
            ranked: ranked,
        })
        
        await setUserActiveMatch(user1, matchId)
        await setUserActiveMatch(user2, matchId)
        
        resolve()
        
        try {
            await waitForServer(server)
        } catch {
            // We honestly dont care if there are some errors during waiting.
        }
        
        dur.end()
    })
}