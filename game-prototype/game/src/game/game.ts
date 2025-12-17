import { io } from "socket.io-client";

export function initGame(domain: string, token: string) {
    // Canvas setup
    const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
    const ctx = canvas.getContext("2d");

    if(ctx === null) {
        throw new Error("Your browser does not support HTML5 Canvas element.")
    }

    // Load sprite sheet from Graphical Assets folder
    const img = new Image();
    console.log("Attempting to load sprite sheet...");
    img.src = "Graphical Assets/sheet_all.png";

    // Sprite sheet dimensions - will be calculated once image loads
    let FRAME_WIDTH = 0;
    let FRAME_HEIGHT = 0;
    const TOTAL_FRAMES_IN_SHEET = 12; // 12 frames per row in sprite sheet

    // Animation frame ranges (which frames to use from sprite sheet)
    const GREEN_FRAMES = { start: 6, end: 11 }; // frames 7-12 (0-indexed: 6-11)
    const RED_FRAMES = { start: 18, end: 23 }; // frames 19-24 (0-indexed: 18-23)
    const ANIM_LENGTH = 6; // 6 frames per animation

    // Display sizes
    const HURTBOX_SIZE = 200; // 200x200 hurtbox
    const HITBOX_SIZE = 100; // 100x100 hitbox

    // Player data - positioned as hurtboxes on left and right
    const players = [
        { x: 150, y: 50, row: 0, frame: 6, animating: false, animFrame: 0, frameRange: GREEN_FRAMES }, // Green
        { x: 450, y: 50, row: 1, frame: 18, animating: false, animFrame: 0, frameRange: RED_FRAMES }, // Red
    ];

    let myPlayerNum = null;
    let imageLoaded = false;

    const socket = io(`https://${domain}/`, {
        auth: {
            token: token,
        },
    });

    // Receive player number from server
    socket.on("init", (data) => {
        myPlayerNum = data.playerNum;
        console.log("You are player", myPlayerNum);
        const color = myPlayerNum === 0 ? "green" : "red";
        const name = myPlayerNum === 0 ? "Green" : "Red";
        document.getElementById("playerNum")!.textContent = `You are ${name} (Player ${myPlayerNum})`;
        document.getElementById("playerNum")!.style.color = color;
    });

    // Receive game state (HP updates)
    socket.on("state", (state) => {
        if (state.player0) document.getElementById("hp0")!.textContent = state.player0.hp;
        if (state.player1) document.getElementById("hp1")!.textContent = state.player1.hp;
    });

    // Receive attack event (animate the attacker) - loop through their frame range
    socket.on("playerAttack", (data) => {
        console.log("Player", data.playerNum, "is attacking!");
        const p = players[data.playerNum];
        if (p) {
            // Always restart animation from beginning, even if already animating
            p.animating = true;
            p.animFrame = 0;
            p.frame = p.frameRange.start; // Start at first frame of range
        }
    });

    let gameOver = false;

    // Game over
    socket.on("gameOver", (data) => {
        const winner = data.winner === 0 ? "Green" : "Red";
        document.getElementById("gameOver")!.textContent = `${winner} wins!`;
        document.getElementById("gameOver")!.style.display = "block";
        gameOver = true;
    });

    // Keyboard input: SPACE to attack
    document.addEventListener("keydown", (e) => {
        if (gameOver) return;
        if (e.code === "Space") {
            e.preventDefault();
            console.log("SPACE pressed - sending attack");
            socket.emit("attack");
        }
    });

    // Animation loop
    let lastTime = 0;
    const ANIM_SPEED = 100; // ms per frame (100ms = slower, more visible animation)

    function draw(time: number) {
        if (!imageLoaded) return;

        if(!ctx) return;

        // Clear canvas
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw each player
        players.forEach((p, i) => {
            // Update animation - loop through player's frame range when attacking
            if (p.animating) {
                if (time - lastTime > ANIM_SPEED) {
                    p.animFrame++;
                    if (p.animFrame >= ANIM_LENGTH) {
                        // Animation complete, return to idle (first frame of range)
                        p.animating = false;
                        p.frame = p.frameRange.start;
                        p.animFrame = 0;
                    } else {
                        p.frame = p.frameRange.start + p.animFrame;
                    }
                }
            }

            // Calculate position in sprite sheet
            // For frames 7-12: column = frame % 12, row = 0
            // For frames 19-24: column = (frame - 12) % 12, row = 1
            const column = p.frame % TOTAL_FRAMES_IN_SHEET;
            const row = Math.floor(p.frame / TOTAL_FRAMES_IN_SHEET);
            const sx = column * FRAME_WIDTH - 450; // Shift 450px to the left in source
            const sy = row * FRAME_HEIGHT;

            // Mirror green player (player 0) horizontally
            if (i === 0) {
                ctx.save();
                ctx.translate(p.x + HURTBOX_SIZE, p.y); // Move to right edge
                ctx.scale(-1, 1); // Flip horizontally
                ctx.drawImage(img, sx, sy, FRAME_WIDTH, FRAME_HEIGHT, 0, 0, HURTBOX_SIZE, HURTBOX_SIZE);
                ctx.restore();
            } else {
                // Draw red player normally
                ctx.drawImage(img, sx, sy, FRAME_WIDTH, FRAME_HEIGHT, p.x, p.y, HURTBOX_SIZE, HURTBOX_SIZE);
            }

            // Draw hurtbox outline (200x200)
            ctx.strokeStyle = i === 0 ? "#0f0" : "#f00";
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, HURTBOX_SIZE, HURTBOX_SIZE);

            // Draw hitbox in front of character when attacking (50x50) - always visible with opacity
            const hitboxX = i === 0 ? p.x + HURTBOX_SIZE : p.x - HITBOX_SIZE; // Right of green, left of red
            const hitboxY = p.y + HURTBOX_SIZE / 2 - HITBOX_SIZE / 2; // Centered vertically

            if (p.animating) {
                // Active hitbox - bright and filled
                ctx.fillStyle = i === 0 ? "#0f0" : "#f00";
                ctx.fillRect(hitboxX, hitboxY, HITBOX_SIZE, HITBOX_SIZE);
                ctx.strokeStyle = i === 0 ? "#0f0" : "#f00";
                ctx.lineWidth = 3;
                ctx.strokeRect(hitboxX, hitboxY, HITBOX_SIZE, HITBOX_SIZE);
            } else {
                // Inactive hitbox - just outline
                ctx.strokeStyle = i === 0 ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
                ctx.lineWidth = 1;
                ctx.strokeRect(hitboxX, hitboxY, HITBOX_SIZE, HITBOX_SIZE);
            }
        });

        if (time - lastTime > ANIM_SPEED) {
            lastTime = time;
        }

        requestAnimationFrame(draw);
    }

    // Start animation when image loads
    img.onload = () => {
        // Calculate frame dimensions from sprite sheet
        FRAME_WIDTH = img.width / TOTAL_FRAMES_IN_SHEET; // 12 columns
        FRAME_HEIGHT = img.height / 2; // 2 rows

        console.log("=== SPRITE SHEET INFO ===");
        console.log("Total image size:", img.width, "x", img.height);
        console.log("Calculated frame size:", FRAME_WIDTH, "x", FRAME_HEIGHT);
        console.log("Green uses frames 7-12 (indices 6-11)");
        console.log("Red uses frames 19-24 (indices 18-23)");
        console.log("========================");

        // Show sprite info on page
        document.getElementById(
            "playerNum"
        )!.textContent += ` | Sprite: ${img.width}x${img.height} | Frame: ${FRAME_WIDTH}x${FRAME_HEIGHT}`;

        imageLoaded = true;
        requestAnimationFrame(draw);
    };

    // If image fails to load, show error
    img.onerror = () => {
        console.error("Failed to load sheet_all.png from Graphical Assets folder");
        alert('Sprite sheet not found! Make sure "Graphical Assets/sheet_all.png" exists.');
    };
}
