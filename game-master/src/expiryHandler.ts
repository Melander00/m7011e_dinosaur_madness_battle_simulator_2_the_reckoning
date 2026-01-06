import { handleExpiredMatches } from "./db/redis";
import { removeServerById } from "./k8s/kubernetes";

export function beginWatchingForExpiredMatches() {
    async function removeExpiredMatches() {
        await handleExpiredMatches(async (expired) => {
            await removeServerById(expired.matchId, expired.namespace);
            // decActiveMatches();
        });
    }
    removeExpiredMatches();
    const interval = setInterval(removeExpiredMatches, 1000 * 60);
    return async () => {
        clearInterval(interval)
    };
}
