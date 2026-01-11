// src/ui/controls/TouchControls.js

export default class TouchControls {
    constructor({ canvas, game, eventBus, soundService }) {
        this.canvas = canvas;
        this.game = game;
        this.eventBus = eventBus;
        this.soundService = soundService;

        this.startPos = null;
        this.threshold = 20; // минимальное расстояние для свайпа

        this.bind();
    }

    bind() {
        this.canvas.addEventListener('touchstart', (e) => {
            this.startPos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.startPos || !this.game.isRunning || this.game.isPaused) return;

            const endPos = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };

            const deltaX = endPos.x - this.startPos.x;
            const deltaY = endPos.y - this.startPos.y;

            // Определяем направление
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Горизонтальный свайп
                if (Math.abs(deltaX) > this.threshold) {
                    this.handleDirection(deltaX > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
                }
            } else {
                // Вертикальный свайп
                if (Math.abs(deltaY) > this.threshold) {
                    this.handleDirection(deltaY > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
                }
            }

            this.startPos = null;
            e.preventDefault();
        }, { passive: false });
    }

    handleDirection(dir) {
        this.game.setDirection(dir);
        if (this.soundService) {
            this.soundService.play('move');
        }
    }
}
