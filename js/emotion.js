
import {
    FilesetResolver,
    FaceLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const EmotionEngine = {
    video: document.getElementById('webcam-feed'),
    faceLandmarker: null,
    isRunning: false,
    lastVideoTime: -1,
    emotionCooldown: false,

    // Configuration
    confidenceThreshold: 0.5, // Face detection confidence

    // BlendShape Indices (Mapping generic names to what we look for)
    // We will dynamically check categories.categoryName in the process loop

    emotionWeights: {
        neutral: 0,
        happy: 5,
        sad: 5,
        angry: 8,   // Reduced from 20 to 8
        fear: 15,
        disgust: 10,
        surprised: 10
    },

    async init() {
        const status = document.getElementById('camera-status');
        if (status) status.innerText = "Initializing Neural Link (MediaPipe)...";

        try {
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );

            this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 2 // Enable 2-face tracking
            });

            if (status) status.innerText = " neural link established. activating camera...";
            this.startVideo();

        } catch (err) {
            console.error("MediaPipe Init Error:", err);
            if (status) status.innerText = "Error: Neural Link Failed.";
        }
    },

    startVideo() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                this.video.srcObject = stream;
                this.video.addEventListener("loadeddata", () => {
                    this.isRunning = true;
                    this.loop();
                });

                const btn = document.getElementById('start-btn');
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "START GAME (2P)";
                }

                const status = document.getElementById('camera-status');
                if (status) status.innerText = "Camera Active. Tracking 2 Subjects... ";
            })
            .catch(err => {
                console.error("Camera Error:", err);
            });
    },

    async loop() {
        if (!this.isRunning) return;

        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;

            if (this.faceLandmarker) {
                const results = this.faceLandmarker.detectForVideo(this.video, performance.now());
                if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                    // Sort faces by x-coordinate to consistently assign P1 (Left) and P2 (Right)
                    // We need faceLandmarks to get coordinates, but blendshapes don't have coords directly.
                    // IMPORTANT: detectForVideo returns faceLandmarks AND faceBlendshapes indices match.

                    const faces = [];
                    for (let i = 0; i < results.faceBlendshapes.length; i++) {
                        // Calculate average X from landmarks if available, else use index (fallback)
                        let avgX = 0;
                        if (results.faceLandmarks && results.faceLandmarks[i]) {
                            avgX = results.faceLandmarks[i][0].x; // Just take nose tip or first point
                        }
                        faces.push({
                            index: i,
                            x: avgX,
                            shapes: results.faceBlendshapes[i].categories
                        });
                    }

                    // Sort: Leftmost (smaller x) is Player 1 (Left Side of Screen). 
                    // Note: Webcam is mirrored usually. If mirrored, Left on screen is Right in world.
                    // Let's assume standard mirror view: Left on screen = P1.
                    faces.sort((a, b) => a.x - b.x);

                    faces.forEach((face, playerIndex) => {
                        this.processBlendshapes(face.shapes, playerIndex);
                    });
                }
            }
        }

        window.requestAnimationFrame(() => this.loop());
    },

    processBlendshapes(blendshapes, playerIndex) {
        // Convert array of {categoryName, score} to a map for easy lookup
        const shapes = {};
        blendshapes.forEach(b => {
            shapes[b.categoryName] = b.score;
        });

        // --- EMOTION LOGIC BASED ON BLENDSHAPES ---
        // We define scores for each emotion based on relevant facial muscles

        const emotions = {};

        // 1. HAPPY (Smiling)
        emotions.happy = (shapes['mouthSmileLeft'] + shapes['mouthSmileRight']) / 2;

        // 2. SAD (Frowning, brow inner up)
        emotions.sad = (shapes['mouthFrownLeft'] + shapes['mouthFrownRight'] + shapes['browInnerUp']) / 3;

        // 3. ANGRY (Brows down, jaw clenched/tight)
        emotions.angry = (shapes['browDownLeft'] + shapes['browDownRight']) / 2;

        // 4. SURPRISED (Brows up, jaw open, eyes wide)
        emotions.surprised = (shapes['browOuterUpLeft'] + shapes['browOuterUpRight'] + shapes['jawOpen']) / 3;

        // 5. FEAR (Eyes wide, brows up but different shape - simplifying to just eye wideness)
        emotions.fear = (shapes['eyeWideLeft'] + shapes['eyeWideRight']) / 2;

        // 6. DISGUST (Nose sneer)
        emotions.disgust = (shapes['noseSneerLeft'] + shapes['noseSneerRight']) / 2;

        // 7. NEUTRAL (Absence of strong movement)
        // We calculate a 'movement' score
        const totalMovement = emotions.happy + emotions.sad + emotions.angry + emotions.surprised + emotions.fear + emotions.disgust;
        emotions.neutral = 1.0 - Math.min(1.0, totalMovement * 1.5); // If movement is high, neutral is low

        // --- SELECT DOMINANT ---

        let dominant = 'neutral';
        let maxScore = 0;

        // Prioritize specific triggers with thresholds

        // Adjust these thresholds to tune sensitivity!
        const THRESHOLDS = {
            happy: 0.4,
            angry: 0.40, // Fine-tuning: 0.45 was too hard, 0.35 was too easy. Trying 0.40.
            surprised: 0.3,
            sad: 0.35,
            fear: 0.3,
            disgust: 0.3
        };

        for (const [e, score] of Object.entries(emotions)) {
            if (e === 'neutral') continue;

            // Check if it passes threshold AND is the highest so far
            if (score > THRESHOLDS[e] && score > maxScore) {
                maxScore = score;
                dominant = e;
            }
        }

        // If no strong emotion detected, stick to neutral

        if (dominant !== 'neutral') {
            this.triggerEmotionEffect(dominant, maxScore, playerIndex);
        } else {
            this.triggerEmotionEffect('neutral', 0, playerIndex);
        }

        // VISUAL DEBUG OVERLAY - REMOVED AS REQUESTED
        // We might want to show P1/P2 status now? 
        // Let's create a small status line for each.
        // For now, removing the single status element update to avoid flicker conflict.

        // Use a persistent status update if available
        if (Game && Game.updatePlayerStatus) {
            Game.updatePlayerStatus(playerIndex, dominant);
        }
    },

    triggerEmotionEffect(emotion, confidence, playerIndex) {
        // Stop effects if game hasn't started
        if (!Game || !Game.isRunning) return;

        // Cooldown
        if (this.emotionCooldown) return;

        // Only cooldown if it's a "hit" (non-neutral), or maybe just short cooldown always
        if (emotion !== 'neutral') {
            this.emotionCooldown = true;
            setTimeout(() => this.emotionCooldown = false, 800); // 0.8s cooldown
        }

        if (emotion === 'happy') {
            SanitySystem.increaseSanity(5, playerIndex);
        } else {
            const drop = this.emotionWeights[emotion] || 0;
            if (drop > 0) SanitySystem.reduceSanity(drop, playerIndex);
        }

        const emojiMap = {
            neutral: '😐',
            angry: '😡',
            sad: '😢',
            fear: '😱',
            disgust: '🤢',
            surprised: '😲',
            happy: '😁'
        };

        const chosenEmoji = emojiMap[emotion] || '😐';
        Game?.setEmoji(chosenEmoji);

        // Visual Effects
        switch (emotion) {
            case 'angry':
                EffectsEngine?.triggerAngry();
                // Game?.triggerSpeedBoost?.(); // Optional, arguably annoying if too frequent
                break;
            case 'sad':
                EffectsEngine?.triggerSad();
                break;
            case 'fear':
                EffectsEngine?.triggerFear();
                break;
            case 'disgust':
                EffectsEngine?.triggerDisgust();
                break;
            case 'surprised':
                EffectsEngine?.triggerSurprise();
                Game?.teleportObstacles?.();
                break;
            case 'happy':
                EffectsEngine?.triggerHappy();
                break;
        }
    }
};

window.EmotionEngine = EmotionEngine;
