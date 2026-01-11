// src/ui/controls/ButtonControls.js

export default class ButtonControls {
    constructor({ canvas, game, eventBus, soundService }) {
        this.canvas = canvas;
        this.game = game;
        this.eventBus = eventBus;
        this.soundService = soundService;
        this.container = null;

        this.dirs = {
            up: { x: 0, y: -1 },
            left: { x: -1, y: 0 },
            down: { x: 0, y: 1 },
            right: { x: 1, y: 0 }
        };

        this.createButtons();
    }

    createButtons() {
        this.container = document.createElement('div');
        this.container.id = 'game-control-buttons';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '20px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.gap = '10px';
        this.container.style.zIndex = '10';

        const buttonSize = '60px';

        const createButton = (dir, iconClass) => {
            const button = document.createElement('button');
            button.className = 'control-btn';
            button.innerHTML = `<i class="${iconClass}"></i>`;
            button.style.width = buttonSize;
            button.style.height = buttonSize;
            button.style.background = 'rgba(255, 255, 255, 0.1)';
            button.style.border = '1px solid var(--neon-blue)';
            button.style.color = 'var(--neon-cyan)';
            button.style.fontSize = '24px';
            button.style.fontFamily = 'Orbitron, sans-serif';
            button.style.borderRadius = '15px'; // Квадратные кнопки со скруглёнными углами
            button.style.cursor = 'pointer';
            button.style.backdropFilter = 'blur(5px)';
            button.style.boxShadow = '0 0 10px var(--neon-blue)';
            button.style.transition = 'all 0.2s ease';
            button.style.display = 'flex';
            button.style.justifyContent = 'center';
            button.style.alignItems = 'center';

            button.addEventListener('touchstart', () => {
                button.style.background = 'var(--neon-blue)';
                button.style.color = '#000';
                button.style.transform = 'scale(0.95)';
            });
            button.addEventListener('touchend', () => {
                button.style.background = 'rgba(255, 255, 255, 0.1)';
                button.style.color = 'var(--neon-cyan)';
                button.style.transform = 'scale(1)';
            });

            button.addEventListener('click', () => {
                if (this.game.isRunning && !this.game.isPaused) {
                    this.game.setDirection(this.dirs[dir]);
                    if (this.soundService) {
                        this.soundService.play('move');
                    }
                }
            });

            return button;
        };

        // Верхняя кнопка (вверх)
        const upButton = createButton('up', 'fa-solid fa-arrow-up');
        upButton.style.alignSelf = 'center';

        // Нижний ряд: влево, вниз, вправо
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '10px';

        row.appendChild(createButton('left', 'fa-solid fa-arrow-left'));
        row.appendChild(createButton('down', 'fa-solid fa-arrow-down'));
        row.appendChild(createButton('right', 'fa-solid fa-arrow-right'));

        this.container.appendChild(upButton);
        this.container.appendChild(row);

        this.canvas.parentNode.appendChild(this.container);
    }

    // Чтобы можно было убрать (например, при hide)
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
