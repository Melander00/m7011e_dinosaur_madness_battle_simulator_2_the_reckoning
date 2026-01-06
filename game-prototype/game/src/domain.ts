import { req } from "./req";

export type MatchDomainResponse = {
    domain: string;
    subpath: string;
};

const DOMAIN_ENDPOINT = import.meta.env.DEV ? "http://localhost:8080/match" : "/api/game-master/match"

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
