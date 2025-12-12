document.addEventListener('DOMContentLoaded', async () => {

    // Initialize Systems
    if (window.EmotionEngine) {
        await EmotionEngine.init();
    }
    Game.init();

    // Add event listeners for UI buttons
    document.getElementById('start-btn').addEventListener('click', () => {
        Game.start();
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('hidden');
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        Game.reset();
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.add('hidden');
        Game.start();
    });

    // simple renderer - add near DOMContentLoaded or in main.js
    function updateCalibrationPanel(expressions) {
        const container = document.getElementById('cal-bars');
        if (!container || !expressions) return;
        container.innerHTML = '';
        for (const [k, v] of Object.entries(expressions)) {
            const pct = Math.round(v * 100);
            const row = document.createElement('div');
            row.style.marginBottom = '4px';
            row.innerHTML = `<div style="display:flex;justify-content:space-between"><span>${k}</span><span>${pct}%</span></div>
            <div style="background:#333;height:8px;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:8px;background:linear-gradient(90deg,#00f3ff,#bc13fe)"></div></div>`;
            container.appendChild(row);
        }
    }

    // call updateCalibrationPanel(smoothedExpressions) inside processEmotion just after computing expressions
    // e.g. add: if (typeof updateCalibrationPanel === 'function') updateCalibrationPanel(expressions);

});
