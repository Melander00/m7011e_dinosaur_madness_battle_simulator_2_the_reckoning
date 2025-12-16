require("dotenv").config()
const express = require("express")
const cors = require("cors")
const app = express()
const { Server } = require("socket.io")
const http = require("http")
const server = http.createServer(app);

const USER1 = process.env["USER1"]
const USER2 = process.env["USER2"]
const MATCH_ID = process.env["MATCH_ID"]

if (!USER1 || !USER2) {
    console.error("User1 or User2 environment variables not set. Make sure they are identical to JWT.sub.")
    process.exit(1)
}

if (!MATCH_ID) {
    console.error("Match doesnt have an ID. Remember to set the environment variable MATCH_ID.1")
    process.exit(1)
}

const game = require("./game")
const { rabbitmq } = require("./rabbit")

app.use(cors())

app.get("/health", (req, res) => {
    res.send("Alive")
})

const PORT = parseInt(process.env["PORT"] || "3000")



function verifyJwt(token) {
    return {
        sub: token
    }
}

const publisher = rabbitmq.createPublisher({
    confirm: true,
    maxAttempts: 5,
    exchanges: [{ exchange: "match-events", type: "topic" }],

})

game.init(USER1, USER2)
game.onGameOver(winner => {
    // TODO: Handle what happens when the game is over.
    console.log("Game Over!")
    publisher.send({
        exchange: "match-events",
        routingKey: "match.completed"
    }, {
        winner,
        id: MATCH_ID
    })
})


const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://ltu-m7011e-1.se"
        ],
        credentials: true,
    }
})

io.use((socket, next) => {
    const jwt = socket.handshake.auth.token;
    if (!jwt) {
        return next(new Error("Unauthorized"))
    }

    try {
        const payload = verifyJwt(jwt)
        const id = payload.sub

        if (!(id === USER1 || id === USER2)) {
            return next(new Error("You aren't apart of this match."))
        }

        socket.userId = id
        next()
    } catch {
        next(new Error("Invalid token"))
    }
})

io.on("connection", (socket) => game.socketConnection(io, socket))

server.listen(PORT, () => {
    console.log(`Game Server listening on port ${PORT}\nWaiting for users: \n\t${USER1} \n\t${USER2}`)
})

async function onShutdown() {
    await publisher.close()
    await rabbitmq.close()
    await io.close()
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)