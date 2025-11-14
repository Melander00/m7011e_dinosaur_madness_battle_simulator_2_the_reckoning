// Minimal Socket.IO fighting game server
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files
app.use(express.static(__dirname));

// Game state: two players with HP
const players = {};
let playerCount = 0;

io.on('connection', (socket) => {
  // Assign player number (0 = green, 1 = red)
  const playerNum = playerCount % 2;
  playerCount++;
  
  // Initialize player
  players[socket.id] = {
    num: playerNum,
    hp: 100
  };
  
  console.log(`Player ${playerNum} connected: ${socket.id}`);
  
  // Send player their number
  socket.emit('init', { playerNum });
  
  // Broadcast current game state to all
  io.emit('state', getGameState());
  
  // Handle attack from this player
  socket.on('attack', () => {
    const attacker = players[socket.id];
    if (!attacker) return;
    
    // Find opponent
    const opponentId = Object.keys(players).find(id => id !== socket.id);
    if (!opponentId) return;
    
    const opponent = players[opponentId];
    
    // Reduce opponent HP by 10
    opponent.hp = Math.max(0, opponent.hp - 10);
    
    console.log(`Player ${attacker.num} attacks! Opponent HP: ${opponent.hp}`);
    
    // Broadcast attack event (so opponent animates)
    io.emit('playerAttack', { playerNum: attacker.num });
    
    // Broadcast updated game state
    io.emit('state', getGameState());
    
    // Check for game over
    if (opponent.hp <= 0) {
      io.emit('gameOver', { winner: attacker.num });
      console.log(`Game Over! Player ${attacker.num} wins!`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Player ${players[socket.id]?.num} disconnected`);
    delete players[socket.id];
    io.emit('state', getGameState());
  });
});

// Helper: get current game state
function getGameState() {
  const state = { player0: null, player1: null };
  for (const id in players) {
    const p = players[id];
    state[`player${p.num}`] = { hp: p.hp };
  }
  return state;
}

const PORT = 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
