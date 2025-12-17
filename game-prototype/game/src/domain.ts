import { req } from "./req";

type MatchDomainResponse = {
    domain: string;
};

export async function getMatchDomain(token: string) {
    const body = await req<MatchDomainResponse>("http://game-master.ltu-m7011e-1.se/match", {
        headers: {
            "Authorization": "Bearer " + token,
        },
    });

    if (body.success) {
        if (typeof body.data === "string") {
            return body.data;
        } else {
            return body.data.domain;
        }
    } else {
        throw new Error(body.text);
    }
}
