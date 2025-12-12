const SanitySystem = {
    // State for multiple players. 0 and 1.
    pState: [
        { sanity: 100, level: 0 },
        { sanity: 100, level: 0 }
    ],
    maxSanity: 100,

    init() {
        this.pState = [
            { sanity: 100, level: 0 },
            { sanity: 100, level: 0 }
        ];
        this.updateUI(0);
        this.updateUI(1);
        EffectsEngine.clearAll();
    },

    reduceSanity(amount, playerId = 0) {
        if (!this.pState[playerId]) return;

        this.pState[playerId].sanity -= amount;
        if (this.pState[playerId].sanity < 0) this.pState[playerId].sanity = 0;

        this.checkLevel(playerId);
        this.updateUI(playerId);

        if (this.pState[playerId].sanity <= 0) {
            Game.gameOver(playerId); // Pass loser ID
        }
    },

    increaseSanity(amount, playerId = 0) {
        if (!this.pState[playerId]) return;

        this.pState[playerId].sanity += amount;
        if (this.pState[playerId].sanity > this.maxSanity) this.pState[playerId].sanity = this.maxSanity;

        this.checkLevel(playerId);
        this.updateUI(playerId);
    },

    checkLevel(playerId) {
        let currentSanity = this.pState[playerId].sanity;
        let pLevel = this.pState[playerId].level;
        let newLevel = 0;

        if (currentSanity < 100) newLevel = 1;
        if (currentSanity <= 80) newLevel = 2;
        if (currentSanity <= 60) newLevel = 3;
        if (currentSanity <= 40) newLevel = 4;
        if (currentSanity <= 20) newLevel = 5;
        if (currentSanity < 10) newLevel = 6;

        if (newLevel !== pLevel) {
            // console.log(`P${playerId} Sanity Level Change: ${pLevel} -> ${newLevel}`);
            this.pState[playerId].level = newLevel;
            // Effects might need to be player specific? For now global effects trigger if ANYONE goes insane?
            // Or maybe just screen shake etc.
            // Let's trigger effects based on the WORST level among players
            this.syncEffects();
        }
    },

    syncEffects() {
        const worstLevel = Math.max(this.pState[0].level, this.pState[1].level);
        EffectsEngine.triggerLevel(worstLevel);
    },

    updateUI(playerId) {
        const fill = document.getElementById(`sanity-fill-p${playerId}`);
        const text = document.getElementById(`sanity-text-p${playerId}`);

        if (fill && text) {
            let s = this.pState[playerId].sanity;
            fill.style.width = `${s}%`;

            // Color update moved to CSS mostly, but text needs update
            if (s > 80) {
                text.innerText = "STABLE";
            } else if (s > 40) {
                text.innerText = "UNSTABLE";
            } else {
                text.innerText = "CRITICAL";
            }
        }
    }
};

// Global accessor
window.SanitySystem = SanitySystem;
