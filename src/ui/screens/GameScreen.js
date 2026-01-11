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
        // Apply theme to initial DOM
        this.applyThemeToDom();
        this.logThemeVars();
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
        // Основной контейнер стилей вынесён в CSS (#game-screen-container) — id уже установлен выше.

        // Создаём canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'gameCanvas';
        this.canvas.className = 'game-canvas';
        this.canvas.tabIndex = 1;

        // Визуальные стили canvas вынесены в CSS (.game-canvas). Следим за размерами через JS.

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

        // 1. Контейнер для заголовка и кнопки настроек
        const headerContainer = document.createElement('div');
        headerContainer.classList.add('header-container');
        this.headerContainer = headerContainer;
        this.screenContainer.insertBefore(headerContainer, this.screenContainer.firstChild);

        // Сам заголовок 
        const headerCard = document.createElement('div');
        headerCard.classList.add('header-card');

        this.title = document.createElement('span');
        this.title.textContent = 'Neon Snake';

        this.scoreLabel = document.createElement('span');
        this.scoreLabel.textContent = 'Score: 0';
        this.scoreLabel.classList.add('score-label');

        headerCard.appendChild(this.title);
        headerCard.appendChild(this.scoreLabel);

        const statsButton = document.createElement('button');
        statsButton.innerHTML = '📊';
        statsButton.classList.add('icon-btn');

        // Клик — переход на экран статистики
        statsButton.onclick = (e) => {
            e.preventDefault();
            this.eventBus.emit('screen:show', { screen: 'stats' });
        };

        // Кнопка настроек 
        const settingsButton = document.createElement('button');
        settingsButton.innerHTML = '⚙️';
        settingsButton.classList.add('icon-btn');

        settingsButton.onclick = (e) => {
            e.preventDefault();
            this.eventBus.emit('screen:show', { screen: 'settings' });
        };

        // Кнопка паузы 
        const pauseButton = document.createElement('button');
        pauseButton.innerHTML = '⏸️';
        pauseButton.title = 'Pause';
        pauseButton.classList.add('icon-btn');

        pauseButton.onclick = (e) => {
            e.preventDefault();
            console.debug('pauseButton clicked');
            const emitted = this.eventBus.emit('game:togglePause');
            // Если никого не подписано (в редком случае инициализации), выполним локально
            if (!emitted) {
                console.debug('game:togglePause had no listeners, calling togglePause directly');
                this.togglePause();
            }
        };

        this.pauseButton = pauseButton;

        // Добавляем элементы в контейнер
        headerContainer.appendChild(headerCard);
        headerContainer.appendChild(statsButton);
        headerContainer.appendChild(settingsButton);

        // 2. Строка с тремя карточками: Level, Speed, Best
        const statsRow = document.createElement('div');
        statsRow.classList.add('stats-row');

        this.levelCard = document.createElement('div');
        this.levelCard.textContent = 'Level: 1';
        this.levelCard.classList.add('ui-card');

        this.speedCard = document.createElement('div');
        this.speedCard.textContent = 'Speed: 0';
        this.speedCard.classList.add('ui-card');

        this.bestCard = document.createElement('div');
        this.bestCard.textContent = 'Best: 0';
        this.bestCard.classList.add('ui-card');

        statsRow.appendChild(this.levelCard);
        statsRow.appendChild(this.speedCard);
        statsRow.appendChild(this.bestCard);
 
        // 3. Прогресс до следующего уровня (в одну строку: label → bar → text)
        this.progressContainer = document.createElement('div');
        this.progressContainer.classList.add('progress-container');

        // Счёт: "3/5"
        this.progressValue = document.createElement('div');
        this.progressValue.classList.add('progress-value');

        // Полоса прогресса (растягивается)
        this.progressBar = document.createElement('div');
        this.progressBar.classList.add('progress-bar');

        this.progressBlocks = [];
        for (let i = 0; i < 10; i++) {
            const block = document.createElement('div');
            block.classList.add('progress-block');
            this.progressBlocks.push(block);
            this.progressBar.appendChild(block);
        }

        // Надпись "Next level"
        this.progressLabel = document.createElement('div');
        this.progressLabel.textContent = 'Next level';
        this.progressLabel.classList.add('progress-label');

        this.progressContainer.appendChild(this.progressLabel);
        this.progressContainer.appendChild(this.progressBar);
        this.progressContainer.appendChild(this.progressValue);

        // Place the progress bar directly above the canvas
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

        // Перенос кнопки паузы в нижнюю панель (чтобы было удобнее дотянуться)
        if (this.pauseButton) {
            const controlsRow = document.createElement('div');
            controlsRow.classList.add('controls-row');
            // Размещаем controlsRow поверх canvas
            controlsRow.style.position = 'relative';
            controlsRow.style.zIndex = '40';
            // Защита: убедимся, что кнопка видима сверху и принимает события
            this.pauseButton.style.zIndex = '50';
            this.pauseButton.style.pointerEvents = 'auto';
            this.pauseButton.tabIndex = 0;
            this.pauseButton.addEventListener('pointerdown', (e) => console.debug('pauseButton pointerdown', e));
            this.pauseButton.addEventListener('click', (e) => console.debug('pauseButton click event', e));
            controlsRow.appendChild(this.pauseButton);
            this.uiContainer.appendChild(controlsRow);
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
        // Ensure pause button reflects current state (paused or not)
        if (this.pauseButton) {
            this.pauseButton.innerHTML = this.game.isPaused ? '▶️' : '⏸️';
            this.pauseButton.title = this.game.isPaused ? 'Resume' : 'Pause';
        }
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
        // Передаём payload (например { silent: true }) дальше — чтобы флаги не терялись
        this.eventBus.on('game:pause', (data) => this.pause(data));
        this.eventBus.on('game:resume', (data) => this.resume(data));
        this.eventBus.on('game:restart', () => this.restart());
        this.eventBus.on('app:blur', () => this.pause());
        this.eventBus.on('game:start', () => {
            this.show();
        });
        this.eventBus.on('game:togglePause', (data) => {
            console.debug('game:togglePause received', data);
            this.togglePause();
        });

        // Когда тема меняется — обновим UI и перерисуем canvas
        this.eventBus.on('theme:changed', (payload) => {
            console.debug('GameScreen: theme changed', payload);
            try {
                this.logThemeVars();
                this.applyThemeToDom();
                // Обновляем прогресс цвета прямо сейчас
                const filled = Math.floor((this.game?.getLevelProgress?.()?.value || 0) * 10);
                this.progressBlocks.forEach((block, i) => {
                    block.style.backgroundColor = i < filled ? 'var(--neon-green)' : 'var(--progress-empty)';
                });
                // Немедленно перерисуем
                this.draw();
            } catch (e) {
                console.warn('Error applying theme in GameScreen', e);
            }
        });

        // Обновление иконки кнопки паузы при изменении состояния игры
        this.eventBus.on('game:pause', () => {
            if (this.pauseButton) {
                this.pauseButton.innerHTML = '▶️';
                this.pauseButton.title = 'Resume';
            }
        });
        this.eventBus.on('game:resume', () => {
            if (this.pauseButton) {
                this.pauseButton.innerHTML = '⏸️';
                this.pauseButton.title = 'Pause';
            }
        });
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
                : 'var(--progress-empty)';
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
        const textColor = this.getCssVariable('--text-color') || '#fff';

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

        // Центр — точка в цвете текста темы
        ctx.shadowBlur = 0;
        ctx.fillStyle = textColor;
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

        const neonPink = this.getCssVariable('--neon-pink', '#ff1493');
        const neonPurple = this.getCssVariable('--neon-purple', '#bf00ff');

        const gradient = ctx.createRadialGradient(
            x + size / 2, y + size / 2, 0,
            x + size / 2, y + size / 2, size
        );
        gradient.addColorStop(0, neonPink);
        gradient.addColorStop(1, neonPurple);

        ctx.fillStyle = gradient;

        const pad = Math.max(2, size * 0.1);
        ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

        ctx.shadowColor = neonPink;
        ctx.shadowBlur = Math.min(8, size * 0.4);
        ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
        ctx.shadowBlur = 0;

        // Глазки
        ctx.fillStyle = this.getCssVariable('--text-color', '#fff');
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
        const neonCyan = this.getCssVariable('--neon-cyan') || '#00f5ff';
        const rgb = this.hexToRgb(neonCyan);
        ctx.shadowColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})` : `rgba(0, 245, 253, ${alpha * 0.6})`;
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

        const overlayVar = getComputedStyle(document.documentElement).getPropertyValue('--overlay-bg').trim() || 'rgba(0,0,0,0.7)';
        let overlayColor = overlayVar;
        if (overlayColor.startsWith('rgba')) {
            // Replace alpha with 0.7 to make pause overlay slightly translucent
            overlayColor = overlayColor.replace(/rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*[^)]+\)/, (m, r, g, b) => `rgba(${r.trim()}, ${g.trim()}, ${b.trim()}, 0.7)`);
        } else if (overlayColor.startsWith('#')) {
            // Convert hex to rgba
            const hex = overlayColor.replace('#','');
            const bigint = parseInt(hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex, 16);
            const r = (bigint >> 16) & 255;
            const g = (bigint >> 8) & 255;
            const b = bigint & 255;
            overlayColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
        }

        ctx.fillStyle = overlayColor;
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

    pause(data = {}) {
        if (this.game.isRunning && !this.game.isPaused) {
            const result = this.game.pause();
            if (result) {
                // Сохраняем флаги из внешнего контекста (например { silent: true })
                const payload = Object.assign({}, result, data);
                this.eventBus.emit('game:pause', payload);
            }
        }
    }

    resume(data = {}) {
        if (this.game.isRunning && this.game.isPaused) {
            const result = this.game.resume();
            if (result) {
                const payload = Object.assign({}, result, data);
                this.eventBus.emit('game:resume', payload);
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

    hexToRgb(hex) {
        if (!hex) return null;
        const h = hex.replace('#','').trim();
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const num = parseInt(full, 16);
        if (Number.isNaN(num)) return null;
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    logThemeVars() {
        const keys = ['--grid-bg','--neon-blue','--neon-green','--neon-cyan','--neon-pink','--text-color','--overlay-bg','--card-bg','--card-border','--accent-glow','--canvas-border'];
        const out = {};
        keys.forEach(k => {
            try { out[k] = this.getCssVariable(k); } catch (e) { out[k] = '(error)'; }
        });
        console.debug('GameScreen theme vars:', out);
    }

    applyThemeToDom() {
        // Применяем переменные темы к существующим DOM-элементам, чтобы сразу увидеть изменения
        try {
            // Header
            if (this.headerContainer) {
                const headerCard = this.headerContainer.querySelector('.header-card');
                if (headerCard) {
                    headerCard.style.background = 'var(--card-bg)';
                    headerCard.style.borderColor = 'var(--card-border)';
                    headerCard.style.boxShadow = '0 0 8px var(--accent-glow)';
                    headerCard.style.color = 'var(--neon-green)';
                }
            }

            // Score/title
            if (this.title) this.title.style.color = 'var(--neon-pink)';
            if (this.scoreLabel) this.scoreLabel.style.color = 'var(--neon-cyan)';

            // UI cards
            [this.levelCard, this.speedCard, this.bestCard].forEach(el => {
                if (!el) return;
                el.style.background = 'var(--card-bg)';
                el.style.border = '1px solid var(--card-border)';
                el.style.boxShadow = '0 0 8px var(--accent-glow)';
                el.style.color = 'var(--neon-cyan)';
            });

            // Progress bar wrapper
            if (this.progressContainer) {
                this.progressContainer.style.background = 'var(--card-bg)';
                this.progressContainer.style.border = '1px solid var(--card-border)';
            }

            // Pause button styling
            if (this.pauseButton) {
                this.pauseButton.style.background = 'var(--card-bg)';
                this.pauseButton.style.border = '1px solid var(--card-border)';
                this.pauseButton.style.boxShadow = '0 0 8px var(--accent-glow)';
                this.pauseButton.style.color = 'var(--neon-purple)';
            }

            // Controls container
            const controls = document.querySelectorAll('#game-control-buttons, .controls');
            controls.forEach(c => {
                c.style.background = 'transparent';
            });

            // Canvas border color
            if (this.canvas) {
                this.canvas.style.borderColor = 'var(--canvas-border)';
            }

            console.debug('GameScreen: applied theme to DOM');
        } catch (e) {
            console.warn('applyThemeToDom failed', e);
        }
    }
}
