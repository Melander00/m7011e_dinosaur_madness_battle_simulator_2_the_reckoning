import { V1Ingress } from "@kubernetes/client-node";

type IngressManifestOptions = {
    matchId: string;
    domain: string
};

export function createIngressManifest({ matchId, domain }: IngressManifestOptions): V1Ingress {
    return {
        metadata: {
            name: `match-${matchId}-ingress`,
            annotations: {
                "traefik.ingress.kubernetes.io/router.entrypoints": "web",
                // "traefik.ingress.kubernetes.io/router.entrypoints": "websecure",
                // "traefik.ingress.kubernetes.io/router.tls": "true",
                "traefik.ingress.kubernetes.io/router.middlewares": "game-servers-cors@kubernetescrd",
                // "cert-manager.io/cluster-issuer": "letsencrypt-staging",
            },
            labels: {
                app: "game-server",
                matchId,
            }
        },
        spec: {
            ingressClassName: "traefik",
            rules: [{
                host: domain,
                http: {
                    paths: [{
                        path: "/",
                        pathType: "Prefix",
                        backend: {
                            service: {
                                name: `match-${matchId}-svc`,
                                port: {
                                    number: 3000
                                }
                            }
                        }
                    }]
                }
            }],
            // tls: [{
            //     hosts: [
            //         "*."+domain
            //     ],
            //     secretName: "game-server-tls"
            // }]
        },
    };
}
