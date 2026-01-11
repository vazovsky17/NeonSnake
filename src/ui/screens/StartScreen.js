// src/ui/screens/StartScreen.js

import Button from '../components/Button.js';

export default class StartScreen {
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.user = null;
        this.element = null;
        this.playButton = null;
        this.isVisible = false;

        this.init();
    }

    init() {
        this.createElement();
        this.createButtons();
        this.bindEvents();
    }

    createElement() {
        if (document.getElementById('startScreen')) {
            this.element = document.getElementById('startScreen');
            return;
        }

        const el = document.createElement('div');
        el.id = 'startScreen';
        el.className = 'screen start-screen';
        el.innerHTML = `
            <div class="modal-content">
                <h1 class="modal-title" data-text="NEON SNAKE">NEON SNAKE</h1>

                <div class="modal-stats">
                    <div class="stat-line">
                        <span class="label">High Score:</span>
                        <span class="value" id="startHighScore">0</span>
                    </div>
                    <div class="stat-line">
                        <span class="label">Best Level:</span>
                        <span class="value" id="startBestLevel">1</span>
                    </div>
                </div>

                <div class="btn-group">
                    <!-- Кнопка добавится через JS -->
                </div>

                <div class="modal-hint">
                    <small>ENTER: Play | SPACE: Pause</small>
                </div>

                <div class="modal-footer">
                    <div class="version">v1.0</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.element = el;
    }

    createButtons() {
        const container = this.element.querySelector('.btn-group');

        this.playButton = new Button({
            text: 'PLAY GAME',
            onClick: () => {
                this.hide();
                this.eventBus.emit('game:start');
            }
        }).appendTo(container);
    }

    bindEvents() {
        this.eventBus.on('user:loaded', (user) => {
            this.user = user;
            this.render();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isVisible) {
                e.preventDefault();
                this.hide();
                this.eventBus.emit('game:start');
            }
        });

        this.eventBus.on('app:ready', () => {
            console.log('🎮 StartScreen: App is ready — showing start menu');
            this.show();
        });
    }

    render() {
        const highScoreEl = this.element.querySelector('#startHighScore');
        const bestLevelEl = this.element.querySelector('#startBestLevel');

        if (highScoreEl) {
            highScoreEl.textContent = this.user?.highScore ?? 0;
        }
        if (bestLevelEl) {
            bestLevelEl.textContent = this.user?.level ?? 1;
        }
    }

    show() {
        if (this.isVisible) return;
        this.isVisible = true;
        this.render();

        document.body.style.overflow = 'hidden';

        requestAnimationFrame(() => {
            this.element.classList.add('show');
            this.element.style.display = 'flex';
        });

        if (this.app.soundService) {
            this.app.soundService.play('menu_open');
        }
    }

    hide() {
        if (!this.isVisible) return;
        this.isVisible = false;

        this.element.classList.remove('show');

        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);

        if (this.app.soundService) {
            this.app.soundService.play('menu_close');
        }

        document.body.style.overflow = '';
    }
}
