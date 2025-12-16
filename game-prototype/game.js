const { Socket, Server } = require("socket.io")

// Game state: two players with HP
const players = {};
let playerCount = 0;

function init(user1, user2) {
    [user1, user2].forEach((user, i) => {
        players[user] = {
            id: user,
            num: i,
            hp: 100
        };
    })
}

/**
 * @param {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} io
 * @param {Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} socket 
 */
function socketConnection(io, socket) {
    const userId = socket.userId
    const player = players[userId]

    // console.log(`Player ${player.num} connected: ${userId}`);

    // Send player their number
    socket.emit('init', { playerNum: player.num });

    // Broadcast current game state to all
    io.emit('state', getGameState());

    // Handle attack from this player
    socket.on('attack', () => {
        const attacker = players[userId];
        if (!attacker) return;

        // Find opponent
        const opponentId = Object.keys(players).find(id => id !== userId);
        if (!opponentId) return;

        const opponent = players[opponentId];

        // Reduce opponent HP by 10
        opponent.hp = Math.max(0, opponent.hp - 10);

        // console.log(`Player ${attacker.num} attacks! Opponent HP: ${opponent.hp}`);

        // Broadcast attack event (so opponent animates)
        io.emit('playerAttack', { playerNum: attacker.num });

        // Broadcast updated game state
        io.emit('state', getGameState());

        // Check for game over
        if (opponent.hp <= 0) {
            listeners.forEach(l => l(attacker))
            io.emit('gameOver', { winner: attacker.num });
        }
    });

    socket.on('disconnect', () => {
        // console.log(`Player ${players[userId]?.num} disconnected`);
        io.emit('state', getGameState());
    });
}

const listeners = []

function onGameOver(listener) {
    listeners.push(listener)
}

// Helper: get current game state
function getGameState() {
    const state = { player0: null, player1: null };
    for (const id in players) {
        const p = players[id];
        state[`player${p.num}`] = { hp: p.hp };
    }
    return state;
}






module.exports = {
    init,
    socketConnection,
    onGameOver
}