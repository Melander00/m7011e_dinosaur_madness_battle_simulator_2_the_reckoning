async function req(endpoint: string, jwt: string, options?: RequestInit | undefined) {
    const res = await fetch(endpoint, {
        headers: {
            "Authorization": "Bearer " + jwt
        },
        ...options
    })

    return res.json()
}

export async function joinMatchmakingQueue(token: string) {
    const data = await req("/api/matchmaking/queue/join", token, {
        method: "POST"
    })
    return data;
}

export async function leaveMatchmakingQueue(token: string) {
    const data = await req("/api/matchmaking/queue/leave", token, {
        method: "POST"
    })
    return data;
}

export async function getMatchmakingStatus(token: string) {
    const data = await req("/api/matchmaking/queue/status", token)
    console.log(data)
    return data;
}