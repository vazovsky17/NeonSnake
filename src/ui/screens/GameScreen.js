// src/ui/screens/GameScreen.js
import ButtonControls from '../controls/ButtonControls.js';
import KeyboardControls from '../controls/KeyboardControls.js';
import TouchControls from '../controls/TouchControls.js';
import Game from '../../models/Game.js';

/**
 * Игровой экран
 * Управляет:
 * - Отрисовкой на canvas
 * - Игровым циклом
 * - Управлением (клавиши, тач, кнопки)
 * - Паузой, рестартом
 */
export default class GameScreen {
    /**
     * @param {App} app - Главный экземпляр приложения
     */
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.canvas = null;
        this.ctx = null;
        this.game = null;
        this.animationId = null;
        this.lastUpdateTime = 0;

        // Размеры сетки
        this.gridWidth = 16;
        this.gridHeight = 16;
        this.cellSize = 20;

        // Инициализация
        this.init();
    }

    /**
     * Инициализация экрана
     */
    init() {
        this.createCanvas();
        this.createUI();
        this.resizeCanvas();
        this.setupGame();
        this.bindEvents();
        this.startLoop();
    }

    /**
     * Создаёт canvas и добавляет в DOM
     */
    createCanvas() {
        // Удаляем старый canvas, если есть
        if (this.canvas) {
            this.canvas.remove();
        }

        // Создаём основной контейнер для UI и canvas
        this.screenContainer = document.createElement('div');
        this.screenContainer.id = 'game-screen-container';
        this.screenContainer.style.display = 'flex';
        this.screenContainer.style.flexDirection = 'column';
        this.screenContainer.style.alignItems = 'center';
        this.screenContainer.style.justifyContent = 'flex-start';
        this.screenContainer.style.width = '100%';
        this.screenContainer.style.height = '100%';
        this.screenContainer.style.padding = '20px 5%';
        this.screenContainer.style.boxSizing = 'border-box';

        // Создаём canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'gameCanvas';
        this.canvas.className = 'game-canvas';
        this.canvas.tabIndex = 1;

        Object.assign(this.canvas.style, {
            display: 'block',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            background: '#0a0e27',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)',
            imageRendering: 'pixelated', // важно для пиксельного вида
            maxWidth: '100%',
            height: 'auto',
            marginLeft: 'auto',
            marginRight: 'auto',
        });

        // Добавляем canvas в контейнер
        this.screenContainer.appendChild(this.canvas);

        // Вставляем контейнер в #app или body
        const container = document.getElementById('app') || document.body;
        container.appendChild(this.screenContainer);

        this.ctx = this.canvas.getContext('2d');
    }


    /**
     * Создаёт UI-элементы: заголовок, счёт, уровень, скорость, рекорд, прогресс
     */
    createUI() {
        if (this.uiContainer) {
            this.uiContainer.remove();
        }

        // Главный контейнер UI
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'game-ui';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.width = '100%';
        this.uiContainer.style.maxWidth = 'none'; // 🔥 Убираем ограничение
        this.uiContainer.style.padding = '0'; // отступы по бокам — 5%
        this.uiContainer.style.boxSizing = 'border-box';
        this.uiContainer.style.zIndex = '20';
        this.uiContainer.style.fontFamily = 'Orbitron, monospace';
        this.uiContainer.style.pointerEvents = 'auto';

        // Стиль для карточек
        const cardStyle = (el) => {
            el.style.display = 'flex';
            el.style.justifyContent = 'center';
            el.style.alignItems = 'center';
            el.style.flex = '1';               // 🔥 Растягиваются равномерно
            el.style.padding = '12px 10px';    // уменьшили боковые отступы
            el.style.border = '1px solid rgba(0, 255, 255, 0.3)';
            el.style.borderRadius = '8px';
            el.style.color = 'var(--neon-cyan)';
            el.style.backgroundColor = 'rgba(0, 20, 20, 0.5)';
            el.style.backdropFilter = 'blur(4px)';
            el.style.fontSize = '14px';
            el.style.fontWeight = 'bold';
            el.style.textAlign = 'center';
            el.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.1)';
            el.style.minWidth = '0';           // важно при flex
        };

        // 1. Контейнер для заголовка и кнопки настроек
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.gap = '12px';
        headerContainer.style.width = '100%';
        headerContainer.style.marginBottom = '12px'; // добавлен отступ между заголовком и остальным UI
        headerContainer.style.pointerEvents = 'auto';
        // Keep a reference for sizing calculations
        this.headerContainer = headerContainer;
        // Place header at the top of the screen (above progress and canvas)
        this.screenContainer.insertBefore(headerContainer, this.screenContainer.firstChild);

        // Сам заголовок (без изменений)
        const headerCard = document.createElement('div');
        headerCard.style.display = 'flex';
        headerCard.style.justifyContent = 'space-between';
        headerCard.style.alignItems = 'center';
        headerCard.style.padding = '12px 20px';
        headerCard.style.flex = '1';
        headerCard.style.border = '1px solid rgba(0, 255, 255, 0.3)';
        headerCard.style.borderRadius = '8px';
        headerCard.style.color = 'var(--neon-green)';
        headerCard.style.backgroundColor = 'rgba(0, 20, 20, 0.5)';
        headerCard.style.backdropFilter = 'blur(4px)';
        headerCard.style.fontSize = '16px';
        headerCard.style.fontWeight = 'bold';
        headerCard.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.1)';
        headerCard.style.textShadow = '0 0 5px var(--neon-green)';

        this.title = document.createElement('span');
        this.title.textContent = 'Neon Snake';

        this.scoreLabel = document.createElement('span');
        this.scoreLabel.textContent = 'Score: 0';
        this.scoreLabel.style.color = 'var(--neon-yellow)';

        headerCard.appendChild(this.title);
        headerCard.appendChild(this.scoreLabel);

        const statsButton = document.createElement('button');
        statsButton.innerHTML = '📊'; // или '📈' — на выбор
        statsButton.style.display = 'flex';
        statsButton.style.alignItems = 'center';
        statsButton.style.justifyContent = 'center';
        statsButton.style.padding = '12px 14px';
        statsButton.style.border = '1px solid rgba(0, 255, 255, 0.3)';
        statsButton.style.borderRadius = '8px';
        statsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.1)';
        statsButton.style.color = 'var(--neon-purple)';
        statsButton.style.cursor = 'pointer';
        statsButton.style.fontSize = '20px';
        statsButton.style.fontWeight = 'bold';
        statsButton.style.backdropFilter = 'blur(4px)';
        statsButton.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.1)';
        statsButton.style.transition = 'all 0.2s ease';
        statsButton.style.flexShrink = '0';
        statsButton.style.boxSizing = 'border-box';
        statsButton.style.minWidth = '0';
        statsButton.style.height = '44px';
        statsButton.style.width = '44px';

        // Ховер-эффект
        statsButton.onmouseenter = () => {
            statsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.3)';
            statsButton.style.transform = 'scale(1.05)';
            statsButton.style.boxShadow = '0 0 12px rgba(185, 103, 255, 0.3)';
        };
        statsButton.onmouseleave = () => {
            statsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.1)';
            statsButton.style.transform = 'scale(1)';
            statsButton.style.boxShadow = '0 0 8px rgba(185, 103, 255, 0.1)';
        };

        // Клик — переход на экран статистики
        statsButton.onclick = (e) => {
            e.preventDefault();
            this.eventBus.emit('screen:show', { screen: 'stats' });
        };

        // Кнопка настроек 
        const settingsButton = document.createElement('button');
        settingsButton.innerHTML = '⚙️';
        settingsButton.style.display = 'flex';
        settingsButton.style.alignItems = 'center';
        settingsButton.style.justifyContent = 'center';
        settingsButton.style.padding = '12px 14px';
        settingsButton.style.border = '1px solid rgba(0, 255, 255, 0.3)';
        settingsButton.style.borderRadius = '8px';
        settingsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.1)';
        settingsButton.style.color = 'var(--neon-purple)';
        settingsButton.style.cursor = 'pointer';
        settingsButton.style.fontSize = '20px';
        settingsButton.style.fontWeight = 'bold';
        settingsButton.style.backdropFilter = 'blur(4px)';
        settingsButton.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.1)';
        settingsButton.style.transition = 'all 0.2s ease';
        settingsButton.style.flexShrink = '0';
        settingsButton.style.boxSizing = 'border-box';
        settingsButton.style.minWidth = '0';
        settingsButton.style.height = '44px';
        settingsButton.style.width = '44px';

        // Ховер-эффект
        settingsButton.onmouseenter = () => {
            settingsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.3)';
            settingsButton.style.transform = 'scale(1.05)';
            settingsButton.style.boxShadow = '0 0 12px rgba(185, 103, 255, 0.3)';
        };
        settingsButton.onmouseleave = () => {
            settingsButton.style.backgroundColor = 'rgba(185, 103, 255, 0.1)';
            settingsButton.style.transform = 'scale(1)';
            settingsButton.style.boxShadow = '0 0 8px rgba(185, 103, 255, 0.1)';
        };

        // Клик
        settingsButton.onclick = (e) => {
            e.preventDefault();
            this.eventBus.emit('screen:show', { screen: 'settings' });
        };

        // Добавляем оба элемента в контейнер
        headerContainer.appendChild(headerCard);
        headerContainer.appendChild(statsButton);
        headerContainer.appendChild(settingsButton);

        // 2. Строка с тремя карточками: Level, Speed, Best
        const statsRow = document.createElement('div');
        statsRow.style.display = 'flex';
        statsRow.style.width = '100%';
        statsRow.style.gap = '12px';
        statsRow.style.marginBottom = '12px';

        this.levelCard = document.createElement('div');
        this.levelCard.textContent = 'Level: 1';
        cardStyle(this.levelCard);

        this.speedCard = document.createElement('div');
        this.speedCard.textContent = 'Speed: 0';
        cardStyle(this.speedCard);

        this.bestCard = document.createElement('div');
        this.bestCard.textContent = 'Best: 0';
        cardStyle(this.bestCard);

        statsRow.appendChild(this.levelCard);
        statsRow.appendChild(this.speedCard);
        statsRow.appendChild(this.bestCard);
        // Не добавляем в this.uiContainer — вставим в DOM между header и progress ниже

        // 3. Прогресс до следующего уровня (в одну строку: label → bar → text)
        this.progressContainer = document.createElement('div');
        this.progressContainer.style.padding = '12px 20px';
        this.progressContainer.style.backgroundColor = 'rgba(0, 20, 20, 0.5)';
        this.progressContainer.style.borderRadius = '8px';
        this.progressContainer.style.border = '1px solid rgba(0, 255, 255, 0.2)';
        this.progressContainer.style.display = 'flex';
        this.progressContainer.style.alignItems = 'center';
        this.progressContainer.style.gap = '16px';
        this.progressContainer.style.fontSize = '12px';
        this.progressContainer.style.color = 'var(--neon-blue)';
        this.progressContainer.style.width = '100%';
        this.progressContainer.style.boxSizing = 'border-box';

        // Счёт: "3/5"
        this.progressValue = document.createElement('div');
        this.progressValue.style.fontFamily = 'monospace';
        this.progressValue.style.fontWeight = 'bold';
        this.progressValue.style.color = 'var(--neon-green)';
        this.progressValue.style.fontSize = '13px';
        this.progressValue.style.flexShrink = '0';

        // Полоса прогресса (растягивается)
        this.progressBar = document.createElement('div');
        this.progressBar.style.display = 'flex';
        this.progressBar.style.flex = '1';
        this.progressBar.style.gap = '1px';
        this.progressBar.style.minWidth = '0';
        this.progressBar.style.justifyContent = 'flex-start';
        this.progressBar.style.borderRadius = '8px';
        this.progressBar.style.border = '1px solid rgba(0, 255, 255, 0.2)';

        this.progressBlocks = [];
        for (let i = 0; i < 10; i++) {
            const block = document.createElement('div');
            block.style.flex = `1`;
            block.style.minWidth = '4px';
            block.style.height = '8px';
            block.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            block.style.transition = 'background-color 0.2s ease';
            this.progressBlocks.push(block);
            this.progressBar.appendChild(block);
        }

        // Надпись "Next level"
        this.progressLabel = document.createElement('div');
        this.progressLabel.textContent = 'Next level';
        this.progressLabel.style.fontSize = '11px';
        this.progressLabel.style.opacity = '0.9';
        this.progressLabel.style.flexShrink = '0';

        this.progressContainer.appendChild(this.progressLabel);
        this.progressContainer.appendChild(this.progressBar);
        this.progressContainer.appendChild(this.progressValue);

        // Place the progress bar directly above the canvas so the field has a small gap below it
        this.progressContainer.style.marginBottom = '12px';
        this.screenContainer.insertBefore(this.progressContainer, this.canvas);

        // Insert statsRow between header and progress so it appears right below header
        if (statsRow) {
            this.screenContainer.insertBefore(statsRow, this.progressContainer);
        }

        // Add the remaining UI under the canvas
        if (this.canvas.nextSibling) {
            this.screenContainer.insertBefore(this.uiContainer, this.canvas.nextSibling);
        } else {
            this.screenContainer.appendChild(this.uiContainer);
        }
    }


    /**
     * Настройка новой игры
     */
    setupGame() {
        this.game = new Game({
            width: this.gridWidth,
            height: this.gridHeight
        });

        this.game.start();
        const initialProgress = this.game.getLevelProgress();

        // Формируем данные с speedFactor
        const uiData = {
            score: this.game.score,
            level: this.game.level,
            progress: initialProgress,
            bestScore: this.app.statsService?.getBestScore() || 0,
            speed: this.game.speed,
            speedFactor: this.game.speedFactor
        };

        this.updateUI(uiData);
        this.eventBus.emit('score:update', uiData);
        this.eventBus.emit('game:reset', { score: 0, level: 1 });
    }

    show() {
        this.canvas.style.display = 'block';
        this.canvas.focus(); // чтобы ловил клавиши
        this.resume(); // если был в паузе
    }

    hide() {
        this.canvas.style.display = 'none';
        this.pause();
    }
    /**
     * Инициализация всех систем управления
     */
    initControls() {
        this.buttonControls = new ButtonControls({
            canvas: this.canvas,
            game: this.game,
            eventBus: this.eventBus,
            soundService: this.app.soundService
        });

        this.keyboardControls = new KeyboardControls({
            canvas: this.canvas,
            game: this.game,
            eventBus: this.eventBus,
            soundService: this.app.soundService
        });

        this.touchControls = new TouchControls({
            canvas: this.canvas,
            game: this.game,
            eventBus: this.eventBus,
            soundService: this.app.soundService
        });
    }

    /**
     * Подписка на события
     */
    bindEvents() {
        // Теперь контроллеры сами подпишутся
        this.initControls();
        this.eventBus.on('score:update', (data) => {
            this.updateUI(data);
        });

        window.addEventListener('resize', () => this.resizeCanvas());
        // Также при повороте экрана (мобильные)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 150);
        });

        // События из EventBus
        this.eventBus.on('game:pause', () => this.pause());
        this.eventBus.on('game:resume', () => this.resume());
        this.eventBus.on('game:restart', () => this.restart());
        this.eventBus.on('app:blur', () => this.pause());
        this.eventBus.on('game:start', () => {
            this.show();
        });
        this.eventBus.on('game:togglePause', () => this.togglePause());
    }

    /**
     * Обновляет UI на основе данных
     * @param {{ score: number, level: number, progress: number, bestScore: number, speed: number, speedFactor: number }} data
     */
    updateUI(data) {
        if (!this.uiContainer) return;

        // Обновляем счёт
        this.scoreLabel.textContent = `Score: ${data.score}`;

        // Обновляем уровень
        this.levelCard.textContent = `Level: ${data.level}`;

        // 🔥 Обновляем скорость как множитель
        const speedFactor = data.speedFactor ? data.speedFactor.toFixed(2).replace(/\.00$/, '').replace(/\.0$/, '') : '1';
        this.speedCard.textContent = `Speed: x${speedFactor}`;

        // Обновляем Best Score
        const currentBest = this.app.statsService?.getBestScore() || 0;
        const newBest = Math.max(currentBest, data.score);
        if (data.score > currentBest && this.app.statsService) {
            this.app.statsService.saveBestScore?.(data.score);
        }
        this.bestCard.textContent = `Best: ${newBest}`;

        // Обновляем прогресс до следующего уровня
        const progress = data.progress;
        const filled = Math.floor(progress.value * 10);
        this.progressBlocks.forEach((block, i) => {
            block.style.backgroundColor = i < filled
                ? 'var(--neon-green)'
                : 'rgba(255, 255, 255, 0.1)';
        });
        this.progressValue.textContent = progress.label;
    }
    /**
     * Обработка клавиш
     */
    handleKeydown(e) {
        if (!this.game.isRunning || this.game.isPaused) return;

        const keyMap = {
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            w: { x: 0, y: -1 },
            s: { x: 0, y: 1 },
            a: { x: -1, y: 0 },
            d: { x: 1, y: 0 }
        };

        const dir = keyMap[e.key];
        if (dir) {
            e.preventDefault();
            this.game.setDirection(dir);
            if (this.app.soundService) {
                this.app.soundService.play('move');
            }
        }

        if (e.key === ' ') {
            e.preventDefault();
            this.togglePause();
        }
    }

    /**
     * Максимально увеличивает canvas, сохраняя 16x16 и целочисленный cellSize
     */
    resizeCanvas() {
        // Ждём, пока DOM полностью подгрузится
        setTimeout(() => {
            const container = this.screenContainer || this.canvas.parentElement;
            const containerWidth = container.clientWidth;

            // Compute heights of elements above the field
            const headerHeight = this.headerContainer ? this.headerContainer.offsetHeight : 0;
            const progressHeight = this.progressContainer ? this.progressContainer.offsetHeight : 0;

            // Logging
            console.log('Container width:', containerWidth, 'Header:', headerHeight, 'Progress:', progressHeight);

            // Determine allowed max height for the field relative to viewport
            const isLandscape = window.innerWidth > window.innerHeight;
            const maxViewportFraction = isLandscape ? 0.75 : 0.6; // allow more on landscape
            const maxAllowedFieldHeight = Math.max(80, Math.floor(window.innerHeight * maxViewportFraction) - headerHeight - progressHeight - 20);

            // Use container width as primary constraint so field fills width
            const maxCellByWidth = Math.floor(containerWidth / this.gridWidth);
            const maxCellByHeight = Math.floor(maxAllowedFieldHeight / this.gridHeight);

            const chosenCell = Math.max(8, Math.min(maxCellByWidth, maxCellByHeight));
            this.cellSize = chosenCell;

            const canvasWidth = this.cellSize * this.gridWidth;
            const canvasHeight = this.cellSize * this.gridHeight;

            console.log('Cell size:', this.cellSize, '→ Canvas:', canvasWidth, 'x', canvasHeight);

            // Internal pixel size
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            // Visual size — fill available width as close as possible
            this.canvas.style.width = `${canvasWidth}px`;
            this.canvas.style.height = `${canvasHeight}px`;

            // Keep it aligned
            this.canvas.style.display = 'block';
            this.canvas.style.margin = '0 auto';
        }, 100); // даём время на рендер
    }

    /**
     * Игровой цикл
     */
    startLoop() {
        const loop = (timestamp) => {
            this.animationId = requestAnimationFrame(loop);

            // Ограничение по FPS (на основе скорости змеи)
            const fps = 1000 / this.game.speed;
            if (timestamp - this.lastUpdateTime < 1000 / fps) return;

            this.lastUpdateTime = timestamp;

            // Обновление логики
            const event = this.game.update();

            // Обработка событий
            if (event) {
                this.handleGameEvent(event);
            }

            // Отрисовка
            this.draw();
        };

        this.animationId = requestAnimationFrame(loop);
    }

    /**
     * Обработка событий из Game
     */
    handleGameEvent(event) {
        switch (event.type) {
            case 'eat':
                this.eventBus.emit('game:eat', event);
                if (this.app.soundService) {
                    this.app.soundService.play('eat');
                }
                this.eventBus.emit('score:update', {
                    score: event.score,
                    level: this.game.level,
                    progress: this.game.getLevelProgress(),
                    bestScore: this.app.statsService?.getBestScore() || 0,
                    speed: this.game.speed,
                    speedFactor: this.game.speedFactor
                });
                break;

            case 'levelup':
                this.eventBus.emit('game:levelup', event);
                if (this.app.soundService) {
                    this.app.soundService.play('level_up');
                }
                this.eventBus.emit('snackbar:show', {
                    message: `🚀 Level ${event.level}!`,
                    type: 'success'
                });
                this.eventBus.emit('score:update', {
                    score: event.score,
                    level: this.game.level,
                    progress: this.game.getLevelProgress(),
                    bestScore: this.app.statsService?.getBestScore() || 0,
                    speed: this.game.speed,
                    speedFactor: this.game.speedFactor
                });
                break;

            case 'gameover':
                this.eventBus.emit('game:gameover', event);
                if (this.app.soundService) {
                    this.app.soundService.play('game_over');
                }
                // Сохраняем счёт в лидерборд
                this.app.statsService?.saveScoreToLeaderboard?.(event.score, event.level);
                break;

            case 'pause':
            case 'resume':
                this.eventBus.emit(`game:${event.type}`, event);
                break;
        }
    }

    /**
     * Отрисовка
     */
    draw() {
        const { ctx, game, cellSize } = this;

        // Очистка
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Сетка (фон)
        this.drawGrid();

        // Еда
        this.drawFood();

        // Змея
        this.drawSnake();

        // Пауза
        if (game.isRunning && game.isPaused) {
            this.drawPauseOverlay();
        }
    }

    /**
     * Отрисовка сетки
     */
    drawGrid() {
        const { ctx, cellSize, gridWidth, gridHeight } = this;

        const gridBg = this.getCssVariable('--grid-bg');
        const gridColor = this.getCssVariable('--neon-blue');

        // Фон сетки
        ctx.fillStyle = gridBg;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = gridColor;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = Math.max(1, Math.floor(cellSize * 0.03));

        for (let i = 0; i <= gridWidth; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, gridHeight * cellSize);
            ctx.stroke();
        }

        for (let i = 0; i <= gridHeight; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(gridWidth * cellSize, i * cellSize);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }


    /**
     * Отрисовка еды
     */
    drawFood() {
        const { ctx, game, cellSize } = this;
        const food = game.food;

        const neonGreen = this.getCssVariable('--neon-green');
        const white = '#fff';

        const x = food.x * cellSize + cellSize / 2;
        const y = food.y * cellSize + cellSize / 2;
        const radius = Math.max(4, cellSize * 0.3); // маленькая еда
        const glow = Math.max(6, cellSize * 0.3);

        // Свечение
        ctx.shadowColor = neonGreen;
        ctx.shadowBlur = glow;
        ctx.fillStyle = neonGreen;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Центр — белая точка
        ctx.shadowBlur = 0;
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }



    /**
     * Отрисовка змеи
     */
    drawSnake() {
        const { ctx, game, cellSize } = this;

        // Исправлено: используем game.snake.body
        game.snake.body.forEach((segment, index) => {
            const isHead = index === 0;
            const x = segment.x * cellSize;
            const y = segment.y * cellSize;

            if (isHead) {
                // Исправлено: game.snake.direction
                this.drawHead(x, y, cellSize, game.snake.direction);
            } else {
                this.drawBody(x, y, cellSize, index);
            }
        });
    }


    /**
     * Отрисовка головы
     */
    drawHead(x, y, size, direction) {
        const { ctx } = this;

        const neonPink = this.getCssVariable('--neon-pink');
        const neonPurple = this.getCssVariable('--neon-purple');

        // Радиальный градиент (как в старом коде)
        const gradient = ctx.createRadialGradient(
            x + size / 2, y + size / 2, 0,
            x + size / 2, y + size / 2, size
        );
        gradient.addColorStop(0, neonPink);
        gradient.addColorStop(1, neonPurple);

        ctx.fillStyle = gradient;

        const pad = Math.max(2, size * 0.1);
        ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

        // Свечение
        ctx.shadowColor = neonPink;
        ctx.shadowBlur = Math.min(8, size * 0.4);
        ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
        ctx.shadowBlur = 0;

        // Глазки — как у вас, отлично!
        ctx.fillStyle = 'white';
        const eyeSize = size * 0.15;
        const eyeOffset = size * 0.3;

        const leftEyeX = x + (direction.x === 1 ? size - eyeOffset : direction.x === -1 ? eyeOffset : eyeOffset);
        const leftEyeY = y + (direction.y === 1 ? size - eyeOffset : direction.y === -1 ? eyeOffset : eyeOffset);

        const rightEyeX = x + (direction.x === 1 ? size - eyeOffset : direction.x === -1 ? eyeOffset : size - eyeOffset);
        const rightEyeY = y + (direction.y === 1 ? size - eyeOffset : direction.y === -1 ? eyeOffset : eyeOffset);

        ctx.fillRect(leftEyeX - eyeSize / 2, leftEyeY - eyeSize / 2, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX - eyeSize / 2, rightEyeY - eyeSize / 2, eyeSize, eyeSize);
    }



    /**
     * Отрисовка тела
     */
    drawBody(x, y, size, index) {
        const { ctx } = this;

        const neonBlue = this.getCssVariable('--neon-blue');
        const alpha = 1 - (index / (this.game.snake.body.length || 1)) * 0.7; // затухание


        ctx.globalAlpha = alpha;

        const pad = Math.max(1, size * 0.15);
        const segmentSize = size - pad * 2;

        ctx.fillStyle = neonBlue;
        ctx.fillRect(x + pad, y + pad, segmentSize, segmentSize);

        // Свечение
        ctx.shadowColor = `rgba(0, 245, 253, ${alpha * 0.6})`;
        ctx.shadowBlur = Math.min(4, size * 0.2);
        ctx.fillRect(x + pad, y + pad, segmentSize, segmentSize);

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }



    /**
     * Отрисовка паузы
     */
    drawPauseOverlay() {
        const { ctx } = this;

        const computeColor = (cssVar) => {
            return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || cssVar;
        };

        const neonGreen = computeColor('--neon-green');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = `bold ${this.cellSize * 1.5}px Orbitron`;
        ctx.fillStyle = neonGreen;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = neonGreen;
        ctx.shadowBlur = 10;
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        ctx.shadowBlur = 0;
    }


    /**
     * Управление паузой
     */
    togglePause() {
        if (!this.game.isRunning) return;
        if (this.game.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    pause() {
        if (this.game.isRunning && !this.game.isPaused) {
            const result = this.game.pause();
            if (result) {
                this.eventBus.emit('game:pause', result);
            }
        }
    }

    resume() {
        if (this.game.isRunning && this.game.isPaused) {
            const result = this.game.resume();
            if (result) {
                this.eventBus.emit('game:resume', result);
            }
        }
    }

    /**
     * Перезапуск игры
     */
    restart() {
        this.game.reset();
        this.game.start();

        const currentProgress = this.game.getLevelProgress();

        this.updateUI({
            score: this.game.score,
            level: this.game.level,
            progress: currentProgress,
            bestScore: this.app.statsService?.getBestScore() || 0,
            speed: this.game.speed
        });

        this.eventBus.emit('score:update', {
            score: this.game.score,
            level: this.game.level,
            progress: currentProgress,
            bestScore: this.app.statsService?.getBestScore() || 0,
            speed: this.game.speed,
            speedFactor: this.game.speedFactor
        });
    }

    getCssVariable(name) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }
}
