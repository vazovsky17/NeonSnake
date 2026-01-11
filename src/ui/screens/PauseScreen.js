// src/ui/screens/PauseScreen.js

/**
 * Экран паузы
 * Показывается поверх игрового поля
 * Позволяет:
 * - Продолжить игру
 * - Перезапустить
 * - Вернуться в меню
 * - Управлять через клавиши
 */
export default class PauseScreen {
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.element = document.getElementById('pauseScreen');
        this.isVisible = false;

        // Кнопки
        this.resumeBtn = null;
        this.restartBtn = null;
        this.menuBtn = null;

        // Инициализация
        this.init();
    }

    init() {
        if (!this.element) {
            this.createElement();
        }

        this.resumeBtn = this.element.querySelector('#pauseResume');
        this.restartBtn = this.element.querySelector('#pauseRestart');
        this.menuBtn = this.element.querySelector('#pauseMenu');

        this.bindEvents();
    }

    createElement() {
        const el = document.createElement('div');
        el.id = 'pauseScreen';
        el.className = 'screen';
        el.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title pause">PAUSED</h2>

                <div class="modal-stats">
                    <div class="stat-line">
                        <span class="label">Score:</span>
                        <span class="value" id="pauseScore">0</span>
                    </div>
                    <div class="stat-line">
                        <span class="label">Level:</span>
                        <span class="value" id="pauseLevel">1</span>
                    </div>
                </div>

                <div class="btn-group">
                    <button id="pauseResume" class="hacker-btn">RESUME</button>
                    <button id="pauseRestart" class="hacker-btn">RESTART</button>
                    <button id="pauseMenu" class="hacker-btn">MAIN MENU</button>
                </div>

                <div class="modal-hint">
                    <small>ESC • P: Resume | R: Restart | M: Menu</small>
                </div>
                
                <div class="modal-footer">
                    <div class="version">v1.0</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.element = el;
    }

    bindEvents() {
        this.resumeBtn?.addEventListener('click', () => this.resume());
        this.restartBtn?.addEventListener('click', () => this.restart());
        this.menuBtn?.addEventListener('click', () => this.toMenu());

        // События из EventBus
        // При получении запроса на паузу — откладываем показ overlay на небольшую задержку.
        // Это предотвращает мерцание паузы при быстром открытии/закрытии модалок и случайных нажатиях пробела.
        this._showTimeout = null;
        this._showDelayMs = 180; // можно тонко подобрать

        this.eventBus.on('game:pause', (data) => {
            this.updateStats(data);

            // Если пауза 'тихая' (например, инициирована модалкой), не показываем overlay
            if (data && data.silent) {
                return;
            }

            // Если уже открыт UI-слой — не будем показывать overlay
            if (this.app && this.app._uiModalCount > 0) {
                return;
            }

            // Отложенный показ: если за это время откроется модалка или придёт resume — отменим
            this.cancelPendingShow();
            this._showTimeout = setTimeout(() => {
                // Дополнительная проверка перед показом
                if (this.app && this.app._uiModalCount > 0) return;
                this.showImmediate();
            }, this._showDelayMs);
        });

        // При резюме — отменяем отложенный показ и скрываем overlay
        this.eventBus.on('game:resume', () => {
            this.cancelPendingShow();
            this.hide();
        });

        // Когда открывается модалка — прячем оверлей паузы и отменяем отложенный показ
        this.eventBus.on('pause:hideOverlay', () => {
            this.cancelPendingShow();
            this.hide();
        });

        // Также при открытии/закрытии любых модалок отменяем/скрываем оверлей
        this.eventBus.on('ui:modal:open', () => {
            this.cancelPendingShow();
            this.hide();
        });

        this.eventBus.on('ui:modal:close', () => {
            // ничего дополнительного — логика восстановления находится в App
        });

        // Управление клавишами
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            switch (e.code) {
                case 'Escape':
                case 'KeyP':
                    e.preventDefault();
                    this.resume();
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.restart();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toMenu();
                    break;
            }
        });
    }

    updateStats(data) {
        const scoreEl = this.element.querySelector('#pauseScore');
        const levelEl = this.element.querySelector('#pauseLevel');

        if (scoreEl) scoreEl.textContent = data.score || 0;
        if (levelEl) levelEl.textContent = data.level || 1;
    }

    // Непосредственный немедленный показ overlay (используется внутренне после задержки)
    showImmediate() {
        if (this.isVisible) return;

        // Если открыт UI-слой — не показываем
        if (this.app && this.app._uiModalCount > 0) return;

        this.isVisible = true;

        requestAnimationFrame(() => {
            this.element.classList.add('show');
            this.element.style.display = 'flex';
        });

        if (this.app.soundService) {
            this.app.soundService.play('menu_open');
        }
    }

    // Публичный вызов show() оставляем совместимым — просто делегируем на немедленный показ
    show() {
        this.cancelPendingShow();
        this.showImmediate();
    }

    hide() {
        // Отменяем ожидаемый показ, если он был
        this.cancelPendingShow();

        if (!this.isVisible) return;

        this.isVisible = false;
        this.element.classList.remove('show');

        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);

        if (this.app.soundService) {
            this.app.soundService.play('menu_close');
        }
    }

    cancelPendingShow() {
        if (this._showTimeout) {
            clearTimeout(this._showTimeout);
            this._showTimeout = null;
        }
    }

    resume() {
        this.eventBus.emit('game:resume');
    }

    restart() {
        this.eventBus.emit('game:restart');
        this.hide();
    }

    toMenu() {
        this.eventBus.emit('game:menu');
        this.hide();
    }
}
