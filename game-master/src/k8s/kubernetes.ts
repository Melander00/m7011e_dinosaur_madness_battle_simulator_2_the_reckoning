import { CoreV1Api, KubeConfig, NetworkingV1Api } from "@kubernetes/client-node";
import { GameServer, ServerOptions } from "../game/GameServer";

const kc = new KubeConfig();
kc.loadFromDefault()

const k8sApi = kc.makeApiClient(CoreV1Api)
const networkApi = kc.makeApiClient(NetworkingV1Api)

export async function createGameServer(options: ServerOptions) {
    const server = await GameServer.create(options, k8sApi, networkApi)
    return server;   
}

export async function waitForServer(server: GameServer) {
    await server.wait(kc)
}

export async function removeServerById(matchId: string, namespace: string) {
    await k8sApi.deleteCollectionNamespacedPod({namespace: namespace, labelSelector: "matchId="+matchId})
    await k8sApi.deleteCollectionNamespacedService({namespace: namespace, labelSelector: "matchId="+matchId})
    await networkApi.deleteCollectionNamespacedIngress({namespace: namespace, labelSelector: "matchId="+matchId})
}