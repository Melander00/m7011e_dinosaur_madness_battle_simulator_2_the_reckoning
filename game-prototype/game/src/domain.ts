import { req } from "./req";

export type MatchDomainResponse = {
    domain: string;
    subpath: string;
};

const DOMAIN_ENDPOINT = import.meta.env.DEV ? "http://localhost:8080/match" : "https://game-master.ltu-m7011e-1.se/match"

export async function getMatchDomain(token: string): Promise<MatchDomainResponse> {
    const body = await req<MatchDomainResponse>(DOMAIN_ENDPOINT, {
        headers: {
            "Authorization": "Bearer " + token,
        },
    });

    if (body.success) {
        if (typeof body.data === "string") {
            return {
                domain: body.data,
                subpath: ""
            };
        } else {
            return body.data;
        }
    } else {
        throw new Error(body.text);
    }
}
