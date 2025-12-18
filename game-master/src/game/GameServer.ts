import { AbortError, CoreV1Api, KubeConfig, NetworkingV1Api, V1Pod, Watch } from "@kubernetes/client-node";
import { createIngressManifest } from "../k8s/gameIngress";
import { createPodManifest } from "../k8s/gamePod";
import { createServiceManifest } from "../k8s/gameService";

export type ServerOptions = {
    matchId: string;
    user1: string;
    user2: string;
    namespace: string;
    domain: string;
    ranked: boolean;
    subpath: string;
};

export class GameServer {
    matchId: string;
    user1: string;
    user2: string;
    namespace: string;
    ranked: boolean;

    private coreApi: CoreV1Api;
    private networkApi: NetworkingV1Api;

    podName: string | null = null;
    serviceName: string | null = null;
    ingressName: string | null = null;

    domain: string;
    subpath: string;

    constructor(options: ServerOptions, coreApi: CoreV1Api, networkApi: NetworkingV1Api) {
        this.matchId = options.matchId;
        this.user1 = options.user1;
        this.user2 = options.user2;
        this.namespace = options.namespace;
        this.ranked = options.ranked;

        this.coreApi = coreApi;
        this.networkApi = networkApi;
        this.domain = options.domain;
        this.subpath = options.subpath;
    }

    async init() {
        const pod = await this.coreApi.createNamespacedPod({
            body: createPodManifest({
                matchId: this.matchId,
                user1: this.user1,
                user2: this.user2,
                ranked: this.ranked,
                subpath: this.subpath,
            }),
            namespace: this.namespace,
        });

        this.podName = pod.metadata?.name ?? null;

        const service = await this.coreApi.createNamespacedService({
            body: createServiceManifest({ matchId: this.matchId }),
            namespace: this.namespace,
        });

        this.serviceName = service.metadata?.name ?? null;

        const ingress = await this.networkApi.createNamespacedIngress({
            body: createIngressManifest({ matchId: this.matchId, domain: this.domain, subpath: this.subpath }),
            namespace: this.namespace,
        });

        this.ingressName = ingress.metadata?.name ?? null;
    }

    static async create(options: ServerOptions, coreApi: CoreV1Api, networkApi: NetworkingV1Api) {
        const server = new GameServer(options, coreApi, networkApi);
        await server.init();
        return server;
    }

    wait(kc: KubeConfig) {
        const watch = new Watch(kc);

        return new Promise<void>(async (resolve, reject) => {
            try {
                const req = await watch.watch(
                    `/api/v1/namespaces/${this.namespace}/pods`,
                    {
                        fieldSelector: `metadata.name=${this.podName}`,
                    },
                    (type, pod: V1Pod) => {
                        const phase = pod.status?.phase;

                        if (phase === "Failed") {
                            req.abort();
                            reject(new Error(`Pod ${this.podName} failed to start`));
                        }

                        const ready = pod.status?.conditions?.find((c) => c.type === "Ready" && c.status === "True");

                        if (ready) {
                            req.abort();
                            resolve();
                        }
                    },
                    (err) => {
                        reject(err);
                    }
                );
            } catch (err) {
                if (err instanceof AbortError) {
                    // Abort error which we ourselves incur. Therefore nothing should be done.
                } else {
                    throw err;
                }
            }
        });
    }

    async stop() {
        if (this.podName) {
            this.coreApi.deleteNamespacedPod({
                name: this.podName,
                namespace: this.namespace,
            });
        }

        if (this.serviceName) {
            this.coreApi.deleteNamespacedService({
                name: this.serviceName,
                namespace: this.namespace,
            });
        }

        if (this.ingressName) {
            this.networkApi.deleteNamespacedIngress({
                name: this.ingressName,
                namespace: this.namespace,
            });
        }
    }
}
