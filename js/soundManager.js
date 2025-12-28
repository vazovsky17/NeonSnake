// Simple sound manager using Web Audio API (no external files)
(function () {
    let ctx = null;

    function ensureContext() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('WebAudio not supported', e);
                ctx = null;
            }
        }
        return ctx;
    }

    let _volume = 1.0;

    function playTone(freq, type = 'sine', duration = 0.08, gainVal = 0.12) {
        if (!ensureContext()) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.setValueAtTime(gainVal * _volume, ctx.currentTime);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        o.stop(ctx.currentTime + duration + 0.02);
    }

    const sounds = {
        click: () => playTone(1200, 'square', 0.05, 0.09),
        move: () => playTone(800, 'sawtooth', 0.05, 0.07),
        eat: () => { playTone(900, 'triangle', 0.08, 0.12); setTimeout(() => playTone(1300, 'sine', 0.06, 0.08), 70); },
        levelup: () => { playTone(1200, 'sine', 0.12, 0.15); setTimeout(() => playTone(1600, 'sine', 0.1, 0.12), 120); },
        gameover: () => { playTone(300, 'sawtooth', 0.24, 0.16); setTimeout(() => playTone(180, 'sine', 0.12, 0.12), 160); },
        start: () => { playTone(1000, 'sine', 0.09, 0.12); setTimeout(() => playTone(1400, 'sine', 0.07, 0.1), 80); },
        pause: () => playTone(600, 'sine', 0.06, 0.09),
        resume: () => playTone(900, 'sine', 0.06, 0.09)
    };

    window.soundManager = {
        play(name) {
            try {
                if (!window.appSettings?.sound) return;
                const s = sounds[name];
                if (typeof s === 'function') s();
            } catch (e) {
                console.warn('soundManager.play failed', e);
            }
        },
        setVolume(v) { _volume = Math.max(0, Math.min(1, Number(v) || 0)); },
        getVolume() { return _volume; }
    };

    // initialize volume from stored settings if present
    try {
        const stored = JSON.parse(localStorage.getItem('appSettings') || 'null');
        if (stored && typeof stored.volume === 'number') window.soundManager.setVolume(stored.volume);
    } catch (e) {}
})();
