const tokens = {}
const hash = ({username, password}) => `${username}:${password}` 

const UUID = "d62f3616-83be-4cc9-b31b-4e2ed4e9b390"
const KENT = {username: "kent", password: "åke"}
const A = {username: "a", password: "a"}

async function getToken(creds) {
    if(tokens[hash(creds)]) return tokens[hash(creds)];

    const res = await fetch("https://keycloak.ltu-m7011e-1.se/realms/myapp/protocol/openid-connect/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "password",
            client_id: "my-frontend-app",
            client_secret: "",
            username: creds.username,
            password: creds.password
        })
    })

    if(res.ok) {
        const json = await res.json()
        tokens[hash(creds)] = json.access_token
        return json.access_token;
    } else {
        throw new Error(res.status, res.statusText)
    }
}

/**
 * 
 * @param {string} endpoint 
 * @param {RequestInit | undefined} options 
 * @param {{username: string, password: string}} creds 
 */
async function req(endpoint, options, creds = {username: "kent", password: "åke"}) {
    const jwt = await getToken(creds)

    const res = await fetch("http://localhost:3004" + endpoint, {
        headers: {
            "Authorization": "Bearer " + jwt
        },
        ...options
    })

    if(res.ok) {
        return res.json()
    } else {
        console.error(`Fetch Error: %o %o %o %o`, endpoint, options, res.status, res.statusText)
    }
}

async function printQueueStats() {
    const stats = await req("/queue/stats")
    console.log(`Queue Stats: %o`, stats)
}

async function printYourStatus(creds = KENT) {
    const status = await req("/queue/status", undefined, creds)

    console.log(`Your Status: %o`, status)
}

async function joinQueue(creds = KENT) {
    const res = await req("/queue/join", {
        method: "POST"
    }, creds)

    console.log(res)
}

async function leaveQueue(creds = KENT) {
    const res = await req("/queue/leave", {
        method: "POST"
    }, creds)

    console.log(res)
}

const intervals = []
const timeouts = []

async function main() {
    await printQueueStats()
    await joinQueue(KENT)
    
    intervals.push(setInterval(() => { printYourStatus(KENT) }, 1000))

    timeouts.push(setTimeout(() => { joinQueue(A) }, 6000))
}

main()

async function shutdown() {
    intervals.forEach(e => clearInterval(e))
    timeouts.forEach(e => clearTimeout(e))
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
