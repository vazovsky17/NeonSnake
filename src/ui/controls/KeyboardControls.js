// src/ui/controls/KeyboardControls.js

export default class KeyboardControls {
    constructor({ canvas, game, eventBus, soundService }) {
        this.canvas = canvas;
        this.game = game;
        this.eventBus = eventBus;
        this.soundService = soundService;

        this.keyMap = {
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            w: { x: 0, y: -1 },
            s: { x: 0, y: 1 },
            a: { x: -1, y: 0 },
            d: { x: 1, y: 0 }
        };

        // Чтобы не реагировать на повторные события (например, удержание)
        this.lastProcessedKey = null;
        this.bind();
    }

    bind() {
        document.addEventListener('keydown', (e) => {
            // Не реагируем, если фокус в инпуте/селекте/textarea — например, при работе с модалками
            const active = document.activeElement;
            if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;

            if (!this.game.isRunning || this.game.isPaused) return;

            const dir = this.keyMap[e.key];

            // Обработка WASD и стрелок
            if (dir) {
                // Предотвращаем повторную обработку одного и того же направления подряд
                if (this.lastProcessedKey === e.key) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                this.lastProcessedKey = e.key;

                // Устанавливаем направление
                this.game.setDirection(dir);
                if (this.soundService) {
                    this.soundService.play('move');
                }

                // Сбрасываем lastProcessedKey при отпускании (частично)
                // Но keyup может не сработать при быстрых движениях — поэтому не полагаемся полностью
                setTimeout(() => {
                    this.lastProcessedKey = null;
                }, 100);
            }

            // Пауза по пробелу
            if (e.key === ' ') {
                e.preventDefault();
                this.eventBus.emit('game:togglePause');
            }
        });

        // Фокус на canvas при клике
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });

        // Обнуляем последнюю клавишу при потере фокуса
        window.addEventListener('blur', () => {
            this.lastProcessedKey = null;
        });
    }
}
