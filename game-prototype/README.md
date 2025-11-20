# Socket.IO Fighting Game Prototype

A minimal two-player fighting game using JavaScript, HTML5 Canvas, and Socket.IO.

## Setup & Run

1. **Install dependencies:**
   ```bash
   cd game-prototype
   npm install
   ```

2. **Your sprite sheet is already in place:**
   - `Graphical Assets/sheet_all.png` is used automatically
   - Sprite sheet format: 12 columns × 2 rows
   - Row 0 = green character, Row 1 = red character
   - Each frame should be 64×64 pixels (adjust `FRAME_WIDTH` and `FRAME_HEIGHT` in `index.html` if different)

3. **Start the server:**
   ```bash
   node index.js
   ```

4. **Open the game:**
   - Open `http://localhost:3000` in two browser tabs/windows
   - First tab = Player 0 (green)
   - Second tab = Player 1 (red)

5. **Play:**
   - Press **SPACE** to attack
   - Each attack deals 10 damage
   - First to 0 HP loses

## Client/Server Message Flow

### Connection Flow:
1. **Client connects** → Server assigns player number (0 or 1)
2. **Server → Client:** `init` event with `{ playerNum: 0 or 1 }`
3. **Server → All Clients:** `state` event with current HP for both players

### Attack Flow:
1. **Client sends:** `attack` event (when player presses SPACE)
2. **Server receives:** Attack from player X
3. **Server logic:** 
   - Finds opponent
   - Reduces opponent HP by 10
   - Checks for game over (HP <= 0)
4. **Server → All Clients:** `playerAttack` event with `{ playerNum: X }` (triggers animation)
5. **Server → All Clients:** `state` event with updated HP values
6. **Server → All Clients (if game over):** `gameOver` event with `{ winner: X }`

### Message Types:

| Event | Direction | Data | Purpose |
|-------|-----------|------|---------|
| `init` | Server → Client | `{ playerNum }` | Tell client which player they are |
| `attack` | Client → Server | none | Player pressed attack key |
| `playerAttack` | Server → All | `{ playerNum }` | Trigger attack animation |
| `state` | Server → All | `{ player0: {hp}, player1: {hp} }` | Update HP display |
| `gameOver` | Server → All | `{ winner }` | Announce winner |

## File Structure

```
index.js                      - Node.js server with Socket.IO
index.html                    - Client with canvas rendering
package.json                  - Dependencies
Graphical Assets/sheet_all.png - Sprite sheet
```

## Notes

- Animation cycles through frames 7-12 for green player, 19-24 for red player
- Green player is horizontally flipped to face right
- Server is authoritative: all damage calculation happens server-side
- No validation or rate limiting (this is a minimal prototype)
