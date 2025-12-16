import * as k8s from "@kubernetes/client-node";
import { GameServer, ServerOptions } from "./gameServer";

const kc = new k8s.KubeConfig();
kc.loadFromDefault()

const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
const networkApi = kc.makeApiClient(k8s.NetworkingV1Api)

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