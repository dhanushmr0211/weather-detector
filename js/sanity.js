const SanitySystem = {
    currentSanity: 100,
    maxSanity: 100,
    currentLevel: 0, // 0 = Sane

    init() {
        this.currentSanity = 100;
        this.currentLevel = 0;
        this.updateUI();
        EffectsEngine.clearAll();
    },

    reduceSanity(amount) {
        this.currentSanity -= amount;
        if (this.currentSanity < 0) this.currentSanity = 0;

        this.checkLevel();
        this.updateUI();

        if (this.currentSanity <= 0) {
            Game.gameOver();
        }
    },

    increaseSanity(amount) {
        this.currentSanity += amount;
        if (this.currentSanity > this.maxSanity) this.currentSanity = this.maxSanity;

        this.checkLevel();
        this.updateUI();
    },

    checkLevel() {
        let newLevel = 0;
        // Stage 1: 100 -> 80
        if (this.currentSanity <= 100) newLevel = 1;
        // Wait, spec says 100 -> 80 is Stage 1. 
        // Let's assume > 80 is Stage 1 (Stable but minor distortion if not perfect 100? or starts at 99?)
        // Actually spec says "Stage 1 - Sanity 100 -> 80". So effectively always at least stage 1?
        // Let's make Stage 0 be perfect 100 for "Start", then immediately drop to 1.

        if (this.currentSanity < 100) newLevel = 1;
        if (this.currentSanity <= 80) newLevel = 2;
        if (this.currentSanity <= 60) newLevel = 3;
        if (this.currentSanity <= 40) newLevel = 4;
        if (this.currentSanity <= 20) newLevel = 5;
        if (this.currentSanity < 10) newLevel = 6;

        // Visual effects trigger only on level change
        if (newLevel !== this.currentLevel) {
            console.log(`Sanity Level Change: ${this.currentLevel} -> ${newLevel}`);
            this.currentLevel = newLevel;
            EffectsEngine.triggerLevel(this.currentLevel);
        }
    },

    updateUI() {
        const fill = document.getElementById('sanity-fill');
        const text = document.getElementById('sanity-text');

        if (fill && text) {
            fill.style.width = `${this.currentSanity}%`;

            // Color change based on level
            if (this.currentSanity > 80) {
                text.innerText = "STABLE";
                text.style.color = "#00f3ff";
                fill.style.background = "linear-gradient(90deg, #00f3ff, #bc13fe)";
            } else if (this.currentSanity > 40) {
                text.innerText = "UNSTABLE";
                text.style.color = "#ffff00";
                fill.style.background = "linear-gradient(90deg, #ffff00, #ff8800)";
            } else {
                text.innerText = "CRITICAL";
                text.style.color = "#ff0055";
                fill.style.background = "linear-gradient(90deg, #ff0055, #660000)";
            }
        }
    }
};

// Global accessor
window.SanitySystem = SanitySystem;
