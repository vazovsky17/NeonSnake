// src/services/SoundService.js

export default class SoundService {
    constructor(settings) {
        this.settings = settings;
        this.ctx = null;
        this._volume = 1.0;
        this._unlocked = false;

        this.initContext();
        this.bindUnlockEvents();
    }

    initContext() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('WebAudio not supported', e);
            this.ctx = null;
        }
    }

    bindUnlockEvents() {
        const unlock = () => {
            if (this.ctx && !this._unlocked) {
                this.ctx.resume().then(() => {
                    this._unlocked = true;
                    console.log('🔊 AudioContext unlocked');
                }).catch(() => {});
            }

            // Убираем слушатели — больше не нужны
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('keydown', unlock);
        };

        // Ловим первое взаимодействие
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);

        // На десктопе может быть уже доступен
        if (this.ctx && this.ctx.state !== 'suspended') {
            this._unlocked = true;
        }
    }

    // ✅ Не делаем init() → или делаем пустым, чтобы не ломать App.js
    async init() {
        // Не ждём разблокировки
        // Просто продолжаем загрузку
        return Promise.resolve();
    }

    play(name) {
        if (!this.settings.sound || !this.ctx) return;

        // Даже если suspended — попробуем через unlock
        if (this.ctx.state === 'suspended') {
            this.bindUnlockEvents(); // на случай, если не сработало
            return;
        }

        const sounds = {
            click: () => this.tone(1200, 'square', 0.05, 0.09),
            move: () => this.tone(800, 'sawtooth', 0.05, 0.07),
            eat: () => {
                this.tone(900, 'triangle', 0.08, 0.12);
                setTimeout(() => this.tone(1300, 'sine', 0.06, 0.08), 70);
            },
            levelup: () => {
                this.tone(1200, 'sine', 0.12, 0.15);
                setTimeout(() => this.tone(1600, 'sine', 0.1, 0.12), 120);
            },
            gameover: () => {
                this.tone(300, 'sawtooth', 0.24, 0.16);
                setTimeout(() => this.tone(180, 'sine', 0.12, 0.12), 160);
            },
            start: () => {
                this.tone(1000, 'sine', 0.09, 0.12);
                setTimeout(() => this.tone(1400, 'sine', 0.07, 0.1), 80);
            },
            pause: () => this.tone(600, 'sine', 0.06, 0.09),
            resume: () => this.tone(900, 'sine', 0.06, 0.09),
            newrecord: () => {
                this.tone(1000, 'sine', 0.08, 0.1);
                setTimeout(() => this.tone(1300, 'sine', 0.08, 0.12), 80);
                setTimeout(() => this.tone(1600, 'sine', 0.1, 0.14), 160);
                setTimeout(() => this.tone(1800, 'triangle', 0.12, 0.1), 260);
            },
            bootStart: () => this.tone(200, 'sine', 0.3, 0.15),
            scanLine: () => this.tone(600, 'sine', 0.05, 0.1),
            bootComplete: () => {
                this.tone(800, 'sine', 0.2, 0.12);
                setTimeout(() => this.tone(1000, 'sine', 0.2, 0.14), 100);
            }
        };

        const sound = sounds[name];
        if (typeof sound === 'function') {
            sound();
        }
    }

    tone(freq, type = 'sine', duration = 0.08, gainVal = 0.12) {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(gainVal * this._volume, this.ctx.currentTime);
        o.connect(g);
        g.connect(this.ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        o.stop(this.ctx.currentTime + duration + 0.02);
    }

    setVolume(volume) {
        this._volume = Math.max(0, Math.min(1, Number(volume) || 0));
    }
}
