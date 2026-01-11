// src/ui/screens/LoadingScreen.js

export default class LoadingScreen {
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.element = null;
        this.bar = null;
        this.percent = null;
        this.lines = [];

        this.init();
    }

    init() {
        this.createElement();
        this.bindEvents();
    }

    createElement() {
        if (document.getElementById('loadingScreen')) {
            this.element = document.getElementById('loadingScreen');
            return;
        }

        const el = document.createElement('div');
        el.id = 'loadingScreen';
        el.className = 'modal'; // ← теперь как все экраны
        el.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title">Neon Snake</h2>

                <div class="loading-bar-container">
                    <div class="loading-bar-fill"></div>
                </div>

                <div class="loading-percent">0%</div>

                <div class="loading-log">
                    <div class="log-line" data-step="init">> INITIALIZING SYSTEM...</div>
                    <div class="log-line" data-step="auth">> AUTHORIZING USER...</div>
                    <div class="log-line" data-step="memory">> LOADING MEMORY CORE...</div>
                    <div class="log-line" data-step="render">> STARTING RENDER ENGINE...</div>
                    <div class="log-line" data-step="sound">> INITIALIZING AUDIO...</div>
                    <div class="log-line" data-step="done">> BOOT COMPLETE. WELCOME, OPERATOR.</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.element = el;
        this.bar = el.querySelector('.loading-bar-fill');
        this.percent = el.querySelector('.loading-percent');
        this.lines = [...el.querySelectorAll('.log-line')];
        this.hideLines();
    }

    hideLines() {
        this.lines.forEach(line => {
            line.style.opacity = '0';
            line.style.transform = 'translateX(-20px)';
        });
    }

    async show() {
        this.element.classList.add('show');
        this.element.style.display = 'flex';

        // Звук запуска
        const bootStart = document.getElementById('bootStart');
        if (bootStart) bootStart.play().catch(() => { });
    }

    updateProgress(percent) {
        this.bar.style.width = `${percent}%`;
        this.percent.textContent = `${Math.min(100, percent)}%`;
    }

    showLine(step) {
        const line = this.element.querySelector(`.log-line[data-step="${step}"]`);
        if (line) {
            line.style.opacity = '1';
            line.style.transform = 'translateX(0)';
            line.style.transition = 'opacity 0.4s, transform 0.4s';
        }
    }

    hide() {
        this.element.classList.remove('show');
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    bindEvents() {
        this.eventBus.on('app:start', () => {
            this.show();
        });

        this.eventBus.on('loading:step', (step) => {
            this.advanceToStep(step);
        });
    }

    async advanceToStep(step) {
        const steps = ['init', 'auth', 'memory', 'render', 'sound', 'done'];
        const index = steps.indexOf(step);
        if (index === -1) return;

        const progress = Math.round(100 * (index + 1) / steps.length);
        this.updateProgress(progress);

        this.showLine(step);

        const audio = document.getElementById('scanLine');
        if (audio) audio.play().catch(() => { });

        if (step === 'done') {
            const complete = document.getElementById('bootComplete');
            if (complete) complete.play().catch(() => { });

            setTimeout(() => {
                this.hide();
            }, 500);
        }
    }
}
