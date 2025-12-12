const Game = {
    canvas: null,
    ctx: null,
    isRunning: false,
    width: 0,
    height: 0,
    score: 0,

    // Game Entities
    player: { x: 0, y: 0, width: 40, height: 40, speed: 8 },
    obstacles: [],
    keys: { ArrowLeft: false, ArrowRight: false },

    // Configuration
    spawnRate: 60, // frames
    frameCount: 0,
    baseObsSpeed: 4,
    currentEmoji: '😐', // Default Emoji

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

        // Reposition player to bottom center
        this.player.y = this.height - 80;
        this.player.x = this.width / 2 - this.player.width / 2;
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.score = 0;
        this.obstacles = [];
        this.spawnRate = 60;
        this.baseObsSpeed = 4;

        SanitySystem.init();
        EffectsEngine.init();

        // Sanity Decay over time
        this.sanityInterval = setInterval(() => {
            if (this.isRunning) SanitySystem.reduceSanity(1);
        }, 1000); // Lose 1 sanity per second naturally

        this.loop();
    },

    stop() {
        this.isRunning = false;
        clearInterval(this.sanityInterval);
    },

    gameOver() {
        this.stop();

        // Dynamic Game Over Text based on "Mood"
        const titles = [
            "SYSTEM FAILURE",
            "EMOTIONAL OVERLOAD",
            "SANITY DEPLETED",
            "REALITY FRACTURED"
        ];
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];

        const titleEl = document.querySelector('#game-over-screen h1');
        if (titleEl) {
            titleEl.innerText = randomTitle;
            titleEl.setAttribute('data-text', randomTitle);
        }

        // Show Game Over UI
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) {
            finalScoreEl.innerText = Math.floor(this.score);
        }

        const screen = document.getElementById('game-over-screen');
        screen.classList.remove('hidden');
        screen.classList.add('active');
    },

    reset() {
        this.score = 0;
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
        this.score += 0.1;

        // Player Movement
        let movement = 0;
        let baseSpeed = this.player.speed;

        // Stage 3 Modifiers: Slippery feel (inertia?) or just faster/erratic? 
        // Spec says "Player movement feels 'slippery'". Implementation: delayed stop or lower friction.
        // For simple arcade, maybe just higher speed makes it feel slippy/uncontrollable or drift.
        if (SanitySystem.currentLevel >= 3) {
            // Slippery: add momentum? For now, we'll just keep it responsive but maybe add drift?
            // "controls feel slippery" -> usually means low friction.
            // Let's implement simple momentum in a future polish if needed, for now just changing speed/response.
            baseSpeed = 10;
        }

        let direction = 0;
        if (this.keys['ArrowLeft']) direction = -1;
        if (this.keys['ArrowRight']) direction = 1;

        // Stage 6: Reverse Controls
        if (SanitySystem.currentLevel >= 6) {
            direction *= -1;
        }

        movement = direction * baseSpeed;

        // Stage 6: Uncontrollable sliding
        if (SanitySystem.currentLevel >= 6 && Math.random() > 0.9) {
            movement += (Math.random() * 20 - 10);
        }

        this.player.x += movement;

        // Boundaries
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.width) this.player.x = this.width - this.player.width;

        // Spawning Obstacles
        let currentSpawnRate = this.spawnRate;
        if (SanitySystem.currentLevel >= 2) currentSpawnRate = 50;
        if (SanitySystem.currentLevel >= 3) currentSpawnRate = 40;
        if (SanitySystem.currentLevel >= 5) currentSpawnRate = 20; // 3 spawns/sec
        if (SanitySystem.currentLevel >= 6) currentSpawnRate = 10; // Chaos

        // Stage 5 & 6: Multiple spawns
        let spawnCount = 1;
        if (SanitySystem.currentLevel >= 5) spawnCount = 2;
        if (SanitySystem.currentLevel >= 6) spawnCount = 3;

        // Anger Mode Override
        if (this.isAngryMode) {
            currentSpawnRate = 10; // Rapid fire
            spawnCount = 2;
        }

        if (this.frameCount % currentSpawnRate === 0) {
            for (let k = 0; k < spawnCount; k++) this.spawnObstacle();
        }

        // Update Obstacles
        for (let i = 0; i < this.obstacles.length; i++) {
            let obs = this.obstacles[i];

            // Standard fall
            let speed = obs.speed;

            // Stage 2+: Falls faster
            if (SanitySystem.currentLevel >= 2) speed *= 1.2;
            if (SanitySystem.currentLevel >= 4) speed *= 1.5;
            if (SanitySystem.currentLevel >= 5) speed *= 2.0;

            // Stage 6: Diagonal / Chaotic Fall
            if (SanitySystem.currentLevel >= 6) {
                obs.x += (Math.random() - 0.5) * 10; // Jitter x
                speed *= 1.2 + Math.random(); // Random speed changes
            }

            obs.y += speed;

            // Stage 3+: Horizontal Drift
            if (SanitySystem.currentLevel >= 3 && SanitySystem.currentLevel < 6) {
                obs.x += Math.sin(obs.y * 0.05 + this.frameCount * 0.1) * 3;
            }

            // Stage 4: Duplicate mid-air
            if (SanitySystem.currentLevel >= 4 && obs.y > this.height * 0.3 && !obs.hasDuplicated && Math.random() > 0.98) {
                this.obstacles.push({ ...obs, x: obs.x + 40, hasDuplicated: true });
                obs.hasDuplicated = true;
            }

            // Collision
            if (
                obs.x < this.player.x + this.player.width &&
                obs.x + obs.width > this.player.x &&
                obs.y < this.player.y + this.player.height &&
                obs.y + obs.height > this.player.y
            ) {
                // Hit!
                this.handleCollision(obs);
                this.obstacles.splice(i, 1);
                i--;
                continue;
            }

            // Cleanup
            if (obs.y > this.height) {
                this.obstacles.splice(i, 1);
                i--;
            }
        }
    },

    spawnObstacle() {
        const size = 30 + Math.random() * 30;
        this.obstacles.push({
            x: Math.random() * (this.width - size),
            y: -size,
            width: size,
            height: size,
            speed: this.baseObsSpeed + Math.random() * 2,
            color: '#ff0055', // Legacy color fallback
            emoji: this.currentEmoji,
            hasDuplicated: false
        });
    },

    setEmoji(newEmoji) {
        if (this.currentEmoji !== newEmoji) {
            this.currentEmoji = newEmoji;
            // Update all existing obstacles to match immediately
            for (let obs of this.obstacles) {
                obs.emoji = newEmoji;
            }
        }
    },

    handleCollision(obs) {
        // Define Emoji Categories
        const healingEmojis = ['😡', '🤬', '💢', '🔥', '😢', '😭', '💧', '💔', '😱', '😨', '👁️', '⚡', '🤢', '🤮', '🦠', '🧟', '😲', '🤯', '💥', '❗'];
        // Note: We check if it INCLUDES the emoji, or just is one of them.

        if (healingEmojis.includes(obs.emoji)) {
            // CATCHING BAD VIBES -> HEAL
            SanitySystem.increaseSanity(25); // Increased from 15 to 25
            EffectsEngine.showPopup("CATHARSIS +25");
        } else {
            // HITTING GOOD VIBES / NEUTRAL -> HURT (Toxic Positivity)
            EffectsEngine.shakeScreen();
            SanitySystem.reduceSanity(10);
        }
    },

    draw() {
        // Clear Canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw Player
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        this.ctx.shadowBlur = 0;

        // Draw Obstacles
        this.ctx.font = "30px Arial"; // Base font size
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        for (let obs of this.obstacles) {
            // Insanity Effect: Flickering or changing colors (still applies to text color if needed, but emoji uses native color)
            // Just apply global alpha flicker maybe?
            if (SanitySystem.currentLevel >= 1 && Math.random() > 0.8) {
                this.ctx.globalAlpha = 0.5;
            } else {
                this.ctx.globalAlpha = 1.0;
            }

            // Draw Emoji
            // Adjust font size to obstacle width
            this.ctx.font = `${obs.width}px serif`;
            this.ctx.fillText(obs.emoji, obs.x + obs.width / 2, obs.y + obs.height / 2);

            // Debug hit box/fallback
            // this.ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
        this.ctx.globalAlpha = 1.0;

        // Draw Timer
        this.ctx.fillStyle = '#ff0055';
        this.ctx.font = 'bold 40px "Outfit", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff0055';
        this.ctx.fillText(this.timeLeft, this.width / 2, 50);

        // Draw Score (Mini)
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px "Inter", sans-serif';
        this.ctx.fillText(`Score: ${this.score}`, this.width / 2, 80);
        this.ctx.shadowBlur = 0;
    },

    // For Anger Emotion
    triggerSpeedBoost() {
        if (this.isAngryMode) return;
        this.isAngryMode = true;

        const originalSpeed = this.baseObsSpeed;
        this.baseObsSpeed *= 3; // Super speed

        // Immediate Burst
        for (let i = 0; i < 5; i++) this.spawnObstacle();

        setTimeout(() => {
            if (this.isRunning) {
                this.baseObsSpeed = originalSpeed;
                this.isAngryMode = false;
            }
        }, 2000); // 2 seconds of rage
    },

    // For Surprise Emotion
    teleportObstacles() {
        for (let obs of this.obstacles) {
            if (Math.random() > 0.5) {
                obs.x = Math.random() * (this.width - obs.width);
                obs.y += (Math.random() * 100 - 50); // Jump up or down
            }
        }
    }
};

window.Game = Game;
