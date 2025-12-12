const Game = {
    canvas: null,
    ctx: null,
    isRunning: false,
    width: 0,
    height: 0,
    score: 0,
    timeLeft: 20, // 20s survival timer

    // Game Entities
    players: [],
    obstacles: [],
    keys: {},

    // Configuration
    spawnRate: 60, // frames
    frameCount: 0,
    baseObsSpeed: 4,
    currentEmoji: '😐', // Default generic

    // Player specific state
    playerEmojis: ['😐', '😐'], // [P1, P2]

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Resize handling
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Controls
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.resetPlayers();
    },

    resetPlayers() {
        // Player 0: Left Side (Cyan) - WASD
        // Player 1: Right Side (Purple) - Arrows
        this.players = [
            { id: 0, x: this.width * 0.25, y: this.height - 80, width: 40, height: 40, color: '#00f3ff', speed: 8, score: 0 },
            { id: 1, x: this.width * 0.75, y: this.height - 80, width: 40, height: 40, color: '#bc13fe', speed: 8, score: 0 }
        ];
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.score = 0;
        this.timeLeft = 20; // Reset timer
        this.obstacles = [];
        this.spawnRate = 60;
        this.baseObsSpeed = 4;
        this.frameCount = 0;

        this.resetPlayers();
        SanitySystem.init();
        EffectsEngine.init();

        // Sanity Decay over time
        this.sanityInterval = setInterval(() => {
            if (this.isRunning) {
                // Decay both players slowly
                SanitySystem.reduceSanity(1, 0);
                SanitySystem.reduceSanity(1, 1);

                // Timer Countdown
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.gameWin();
                }
            }
        }, 1000);

        this.loop();
    },

    stop() {
        this.isRunning = false;
        clearInterval(this.sanityInterval);
    },

    gameOver(loserId) {
        this.stop();

        // Determine Winner
        let winnerId = (loserId === 0) ? 1 : 0;
        let winnerScore = Math.floor(this.players[winnerId].score);

        // Dynamic Game Over Text
        const titleEl = document.querySelector('#game-over-screen h1');
        if (titleEl) {
            let msg = `PLAYER ${loserId + 1} CRASHED`;
            titleEl.innerText = msg;
            titleEl.setAttribute('data-text', msg);
        }

        const scoreEl = document.getElementById('final-score');
        if (scoreEl) {
            // Show Winner Info
            scoreEl.innerHTML = `WINNER: <span style="color:${winnerId === 0 ? '#00f3ff' : '#bc13fe'}">PLAYER ${winnerId + 1}</span><br>Score: ${winnerScore}`;
        }

        // Hide restart button text change? Or just keep "REBOOT SYSTEM"
        // Maybe change subtitle
        const subEl = document.querySelector('#game-over-screen p:nth-child(2)');
        if (subEl) subEl.innerText = `Player ${winnerId + 1} maintained stability.`;

        const screen = document.getElementById('game-over-screen');
        screen.classList.remove('hidden');
        screen.classList.add('active');
    },

    gameWin() {
        this.stop();
        const titleEl = document.querySelector('#game-over-screen h1');
        if (titleEl) {
            titleEl.innerText = "NEURAL LINK STABLE";
            titleEl.setAttribute('data-text', "SURVIVED");
        }

        const scoreEl = document.getElementById('final-score');
        if (scoreEl) scoreEl.innerText = Math.floor(this.score);

        const screen = document.getElementById('game-over-screen');
        screen.classList.remove('hidden');
        screen.classList.add('active');
    },

    reset() {
        this.score = 0;
        this.timeLeft = 20;
        SanitySystem.init();
    },

    loop() {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.loop());
    },

    update() {
        this.frameCount++;
        // this.score += 0.1; // Removed global score

        // --- PLAYER UPDATES ---
        this.players.forEach(p => {
            // Speed modifiers based on THEIR sanity level
            let level = SanitySystem.pState[p.id].level;
            let speed = p.speed;

            if (level >= 3) speed = 10; // Slippery/Fast

            let direction = 0;
            if (p.id === 0) { // P1 WASD
                if (this.keys['KeyA']) direction = -1;
                if (this.keys['KeyD']) direction = 1;
            } else { // P2 Arrows
                if (this.keys['ArrowLeft']) direction = -1;
                if (this.keys['ArrowRight']) direction = 1;
            }

            if (level >= 6) direction *= -1; // Reverse Controls

            let movement = direction * speed;

            // Chaos slide
            if (level >= 6 && Math.random() > 0.9) {
                movement += (Math.random() * 20 - 10);
            }

            p.x += movement;

            // Boundaries (Split Screen)
            if (p.id === 0) {
                // Player 1 confined to Left Half (0 to width/2)
                if (p.x < 0) p.x = 0;
                if (p.x + p.width > this.width / 2) p.x = this.width / 2 - p.width;
            } else {
                // Player 2 confined to Right Half (width/2 to width)
                if (p.x < this.width / 2) p.x = this.width / 2;
                if (p.x + p.width > this.width) p.x = this.width - p.width;
            }

            // Increment Per-Player Score
            p.score += 0.1;
        });


        // --- OBSTACLE SPAWNING ---
        // Global spawn rate logic
        let baseRate = this.spawnRate; // 60

        // Spawn for each player independently
        [0, 1].forEach(pid => {
            let level = SanitySystem.pState[pid].level;

            let currentRate = baseRate;
            if (level >= 2) currentRate = 50;
            if (level >= 3) currentRate = 40;
            if (level >= 5) currentRate = 20;
            if (level >= 6) currentRate = 10;

            if (this.frameCount % currentRate === 0) {
                let count = (level >= 5) ? 2 : 1;
                for (let k = 0; k < count; k++) this.spawnObstacle(pid);
            }
        });

        // --- UPDATE OBSTACLES ---
        for (let i = 0; i < this.obstacles.length; i++) {
            let obs = this.obstacles[i];

            // Logic based on TARGET PLAYER'S sanity level
            let targetP = this.players[obs.targetPlayerId];
            let level = SanitySystem.pState[obs.targetPlayerId]?.level || 0;

            let speed = obs.speed;
            if (level >= 2) speed *= 1.2;
            if (level >= 4) speed *= 1.5;

            if (level >= 6) {
                obs.x += (Math.random() - 0.5) * 10;
                speed *= 1.2 + Math.random();
            }

            // Horizontal Drift
            if (level >= 3 && level < 6) {
                obs.x += Math.sin(obs.y * 0.05 + this.frameCount * 0.1) * 3;
            }

            // Stage 4: Duplicate
            if (level >= 4 && obs.y > this.height * 0.3 && !obs.hasDuplicated && Math.random() > 0.98) {
                // Duplicate must respect bounds!
                // Simple shift, but clamp it if needed?
                this.obstacles.push({ ...obs, x: obs.x + 40, hasDuplicated: true });
                obs.hasDuplicated = true;
            }

            obs.y += speed;

            // Strict Boundary Enforcement (Prevent Mixing)
            const GAP = 20;

            if (obs.targetPlayerId === 0) {
                // Keep P1 (Left) obstacles on the left (minus gap)
                if (obs.x < 0) obs.x = 0;
                if (obs.x + obs.width > (this.width / 2) - GAP) obs.x = (this.width / 2) - GAP - obs.width;
            } else {
                // Keep P2 (Right) obstacles on the right (plus gap)
                if (obs.x < (this.width / 2) + GAP) obs.x = (this.width / 2) + GAP;
                if (obs.x + obs.width > this.width) obs.x = this.width - obs.width;
            }

            // Collision Check (Only with target player?)
            // Yes, obstacles in P1 zone hit P1.
            if (
                obs.x < targetP.x + targetP.width &&
                obs.x + obs.width > targetP.x &&
                obs.y < targetP.y + targetP.height &&
                obs.y + obs.height > targetP.y
            ) {
                this.handleCollision(obs, targetP);
                this.obstacles.splice(i, 1);
                i--;
                continue;
            }

            if (obs.y > this.height) {
                this.obstacles.splice(i, 1);
                i--;
            }
        }
    },

    spawnObstacle(playerId) {
        const size = 30 + Math.random() * 30;

        // Determine Bounds based on Player ID with GAP
        // Gap of 40px total (20px each side of center)
        const GAP = 20;
        let minX, maxX;

        if (playerId === 0) {
            // P1: 0 to Center - Gap
            minX = 0;
            maxX = (this.width / 2) - GAP;
        } else {
            // P2: Center + Gap to Width
            minX = (this.width / 2) + GAP;
            maxX = this.width;
        }

        // Spawn
        // Ensure maxX > minX just in case window is tiny
        if (maxX <= minX) return;

        let x = minX + Math.random() * (maxX - minX - size);

        // Get emoji from Player's Face State
        let emoji = this.playerEmojis[playerId] || '😐';

        this.obstacles.push({
            x: x,
            y: -size,
            width: size,
            height: size,
            speed: this.baseObsSpeed + Math.random() * 2,
            emoji: emoji,
            targetPlayerId: playerId, // Important: Track owner
            hasDuplicated: false
        });
    },

    setEmoji(newEmoji) {
        // Legacy fallback
        this.currentEmoji = newEmoji;
    },

    // Called by EmotionEngine
    updatePlayerStatus(playerId, emotion) {
        const emojiMap = {
            neutral: '😐', angry: '😡', sad: '😢', fear: '😱',
            disgust: '🤢', surprised: '😲', happy: '😁'
        };
        // Safety check
        if (this.playerEmojis[playerId] !== undefined) {
            this.playerEmojis[playerId] = emojiMap[emotion] || '😐';
        }
    },

    handleCollision(obs, player) {
        const healingEmojis = ['😡', '🤬', '💢', '🔥', '😢', '😭', '💧', '💔', '😱', '😨', '👁️', '⚡', '🤢', '🤮', '🦠', '🧟', '😲', '🤯', '💥', '❗'];

        if (healingEmojis.includes(obs.emoji)) {
            SanitySystem.increaseSanity(25, player.id);
            EffectsEngine.showPopup("CATHARSIS +25");
        } else {
            SanitySystem.reduceSanity(10, player.id);
            EffectsEngine.shakeScreen();
        }
    },

    draw() {
        // Clear Canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Divider
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.setLineDash([10, 10]);
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.restore();

        // Draw Players
        this.players.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = p.color;
            this.ctx.fillRect(p.x, p.y, p.width, p.height);
        });
        this.ctx.shadowBlur = 0;

        // Draw Obstacles
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        for (let obs of this.obstacles) {
            let pLevel = SanitySystem.pState[obs.targetPlayerId]?.level || 0;

            if (pLevel >= 1 && Math.random() > 0.8) {
                this.ctx.globalAlpha = 0.5;
            } else {
                this.ctx.globalAlpha = 1.0;
            }

            this.ctx.font = `${obs.width}px serif`;
            this.ctx.fillText(obs.emoji, obs.x + obs.width / 2, obs.y + obs.height / 2);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Timer
        this.ctx.fillStyle = '#ff0055';
        this.ctx.font = 'bold 40px "Outfit", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff0055';
        this.ctx.fillText(this.timeLeft, this.width / 2, 60);

        // Draw Score (Mini) - Split
        this.ctx.font = '20px "Inter", sans-serif';

        // P1 Score (Left)
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.fillText(`Score: ${Math.floor(this.players[0].score)}`, this.width * 0.25, 90);

        // P2 Score (Right)
        this.ctx.fillStyle = '#bc13fe';
        this.ctx.fillText(`Score: ${Math.floor(this.players[1].score)}`, this.width * 0.75, 90);

        this.ctx.shadowBlur = 0;
    },

    // Legacy method stubs if called by effects
    triggerSpeedBoost() { /* No-op for now or reimplement for specific player? */ },
    teleportObstacles() { /* Reimplements if needed */ }
};

window.Game = Game;
