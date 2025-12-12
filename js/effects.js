const EffectsEngine = {
    body: document.body,
    canvas: document.getElementById('game-canvas'),
    popup: document.getElementById('insanity-popup'),

    init() {
        this.clearAll();
    },

    triggerLevel(level) {
        // Clear previous levels first to avoid conflict if needed, or just add
        // For progressive, we might want to keep lower levels, but CSS structure suggests replacing
        // The previous implementation added cumulative classes, let's stick to specific level class for main container
        // and handle cumulative logic if needed.

        // Remove all level classes
        this.body.classList.remove('insanity-lvl-1', 'insanity-lvl-2', 'insanity-lvl-3', 'insanity-lvl-4', 'insanity-lvl-5', 'insanity-lvl-6');

        if (level > 0) {
            this.body.classList.add(`insanity-lvl-${level}`);
        }

        // Popup Warnings based on level
        const warnings = {
            3: "SYSTEM STABILITY FAILING",
            4: "SANITY CRITICAL",
            // 5: "SYSTEM FAILING...", // Removed
            6: "!!! INSANITY MODE ACTIVATED !!!"
        };

        if (warnings[level]) {
            this.showPopup(warnings[level]);
        }
    },

    clearLevel(returnToLevel) {
        this.triggerLevel(returnToLevel);
    },

    clearAll() {
        this.body.className = '';
        // Remove specific persistent effects overlays if any
        const rain = document.querySelector('.rain-overlay-css');
        if (rain) rain.remove();
        this.body.classList.remove('blur-screen', 'hue-rotate-anim');
    },

    // --- Emotion Triggers ---

    triggerAngry() {
        this.shakeScreen('heavy');
        this.flashOverlay('red');
        this.spawnEmojis(['😡', '🤬', '💢', '🔥']);
        this.showPopup("ANGER DETECTED");
    },

    triggerSad() {
        if (!document.querySelector('.rain-overlay-css')) {
            const rain = document.createElement('div');
            rain.className = 'rain-overlay-css';
            this.body.appendChild(rain);
            setTimeout(() => rain.remove(), 5000); // Rain for 5 seconds
        }
        this.body.classList.add('blur-screen');
        setTimeout(() => this.body.classList.remove('blur-screen'), 3000);
        this.spawnEmojis(['😢', '😭', '💧', '💔']);
        this.showPopup("SADNESS DETECTED");
    },

    triggerFear() {
        this.flickerScreen();
        // Text glitch could be a class on the UI container
        document.getElementById('ui-layer').classList.add('rgb-split');
        setTimeout(() => document.getElementById('ui-layer').classList.remove('rgb-split'), 2000);
        this.spawnEmojis(['😱', '😨', '👁️', '⚡']);
        this.showPopup("FEAR DETECTED");
    },

    triggerDisgust() {
        this.body.classList.add('rgb-split'); // Apply to whole body
        setTimeout(() => this.body.classList.remove('rgb-split'), 2000);
        this.spawnEmojis(['🤢', '🤮', '🦠', '🧟']);
        this.showPopup("DISGUST DETECTED");
    },

    triggerSurprise() {
        this.distortScreen();
        this.spawnEmojis(['😲', '🤯', '💥', '❗']);
        this.showPopup("SURPRISE DETECTED");
    },

    triggerHappy() {
        this.body.classList.add('hue-rotate-anim'); // wobble/shift
        setTimeout(() => this.body.classList.remove('hue-rotate-anim'), 3000);
        this.spawnEmojis(['😊', '😂', '🌟', '✨']);
        this.showPopup("HAPPINESS DETECTED");
    },

    // --- Visual Helpers ---

    shakeScreen(intensity) {
        let distance = intensity === 'heavy' ? 20 : 10;
        const keyframes = [
            { transform: 'translate(0,0)' },
            { transform: `translate(${Math.random() * distance - distance / 2}px, ${Math.random() * distance - distance / 2}px)` },
            { transform: 'translate(0,0)' }
        ];
        this.body.animate(keyframes, { duration: 100, iterations: intensity === 'heavy' ? 10 : 5 });
    },

    flashOverlay(color) {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = color;
        overlay.style.opacity = '0.5';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999';
        this.body.appendChild(overlay);

        const anim = overlay.animate([
            { opacity: 0.5 },
            { opacity: 0 }
        ], { duration: 500 });

        anim.onfinish = () => overlay.remove();
    },

    flickerScreen() {
        const keyframes = [
            { opacity: 1 },
            { opacity: 0 },
            { opacity: 1 },
            { opacity: 0.5 },
            { opacity: 1 }
        ];
        this.body.animate(keyframes, { duration: 200, iterations: 3 });
    },

    distortScreen() {
        // CSS transform scale/skew
        const keyframes = [
            { transform: 'scale(1)' },
            { transform: 'scale(1.1) skewX(5deg)' },
            { transform: 'scale(0.9) skewY(-5deg)' },
            { transform: 'scale(1)' }
        ];
        this.body.animate(keyframes, { duration: 500 });
    },

    spawnEmojis(emojiList) {
        // Fallback if no list provided
        const list = emojiList || ['😊', '😂', '🌟', '✨'];

        for (let i = 0; i < 15; i++) { // Increased count slightly
            const emoji = document.createElement('div');
            emoji.innerText = list[Math.floor(Math.random() * list.length)];
            emoji.style.position = 'absolute';
            emoji.style.left = Math.random() * window.innerWidth + 'px';
            emoji.style.top = window.innerHeight + 'px';
            emoji.style.fontSize = (20 + Math.random() * 40) + 'px'; // Random size
            emoji.style.transition = 'top 2s ease-out, opacity 2s ease-out';
            emoji.style.opacity = '1';
            emoji.style.zIndex = '200'; // Higher z-index to be seen
            emoji.style.pointerEvents = 'none';
            document.body.appendChild(emoji);

            requestAnimationFrame(() => {
                // Rise up to random height
                emoji.style.top = (Math.random() * window.innerHeight * 0.2) + 'px'; // Rise mostly to top
                emoji.style.opacity = '0';
            });

            setTimeout(() => emoji.remove(), 2000);
        }
    },

    showPopup(text) {
        const popup = document.getElementById('insanity-popup');
        if (popup) {
            popup.innerText = text;
            popup.classList.remove('hidden');
            popup.style.display = 'block'; // Ensure visible

            // Random position variation
            popup.style.top = `${30 + Math.random() * 40}%`;
            popup.style.left = `${30 + Math.random() * 40}%`;
            popup.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 20 - 10}deg)`;

            setTimeout(() => {
                popup.classList.add('hidden');
                popup.style.display = 'none';
            }, 2000);
        }
    },

    glitchCanvas() {
        if (!this.canvas) return;
        this.canvas.style.filter = "invert(1) hue-rotate(180deg)";
        setTimeout(() => {
            this.canvas.style.filter = "none";
        }, 150);
    }
};

window.EffectsEngine = EffectsEngine;
