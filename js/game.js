tg.expand();

if (typeof tg.enableClosingConfirmation === 'function') {
    try { tg.enableClosingConfirmation(); } catch (e) { console.warn('enableClosingConfirmation failed', e); }
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_COUNT = 16;
let cellSize = 20;

const setCanvasSize = () => {
    const container = document.querySelector('.game-container');
    const maxSize = Math.min(
        container.clientWidth - 20,
        container.clientHeight - 20,
        500
    );

    cellSize = Math.floor(maxSize / TILE_COUNT) || 20;
    const size = cellSize * TILE_COUNT;

    canvas.width = size;
    canvas.height = size;
};

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Game state
let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let directionQueue = [];
let food = { x: 15, y: 15 };
let score = 0;
let level = 1;
let gameSpeed = 150;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;

// User data
let userId = null;
let userName = 'Player';
let totalGames = 0;
let totalScore = 0;
let highScore = 0;  // изначально 0 — будет загружен

// Get user info
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    userId = tg.initDataUnsafe.user.id;
    userName = tg.initDataUnsafe.user.first_name || 'Player';
    if (tg.initDataUnsafe.user.last_name) {
        userName += ' ' + tg.initDataUnsafe.user.last_name;
    }
} else {
    userId = tg?.initDataUnsafe?.hash || 'anonymous_' + Date.now();
    userName = 'Guest';
}

// === Инициализация статистики из облака ===
const initPersonalStats = async () => {
    try {
        const stats = await loadPersonalStats(); // ✅ из stats.js

        if (stats) {
            highScore = stats.highScore;
            totalGames = stats.totalGames;
            totalScore = stats.totalScore;
            console.log('Loaded stats from cloud:', stats);
        } else {
            // fallback: localStorage
            highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
            totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
            totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
            console.log('Loaded stats from localStorage');
        }
    } catch (e) {
        console.warn('Failed to load personal stats', e);
        // fallback
        highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
        totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
    }

    updateUI();
};

// Update UI
const updateUI = () => {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('speed').textContent = `${level}x`;

    const highScoreEl = document.getElementById('highScore');

    // 🔥 Новый рекорд — обновляем в реальном времени
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;

        // ✨ Визуальный эффект
        highScoreEl.style.color = 'var(--neon-yellow)';
        highScoreEl.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8)';

        setTimeout(() => {
            highScoreEl.style.color = '';
            highScoreEl.style.textShadow = '';
        }, 800);

        // 🔊 Звук нового рекорда
        if (window.soundManager) {
            window.soundManager.play('newrecord');
        }

        // 📱 Вибрация (если включена)
        if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
    }

    const currentLevelScore = getRequiredScoreForLevel(level);
    const nextLevelScore = getRequiredScoreForLevel(level + 1);
    const scoreInLevel = score - currentLevelScore;
    const scoreNeeded = nextLevelScore - currentLevelScore;
    const progress = Math.min(100, (scoreInLevel / scoreNeeded) * 100);

    document.getElementById('levelProgressText').textContent = `${scoreInLevel}/${scoreNeeded}`;
    document.getElementById('progressBar').style.width = `${progress}%`;
};

// Level progression
const getRequiredScoreForLevel = (level) => {
    if (level === 1) return 0;
    const base = 3;
    const multiplier = 1.5;
    return Math.floor(base * (Math.pow(multiplier, level - 1) - 1) / (multiplier - 1));
};

const getLevelFromScore = (score) => {
    let currentLevel = 1;
    while (score >= getRequiredScoreForLevel(currentLevel + 1)) {
        currentLevel++;
    }
    return currentLevel;
};

// Generate food
const generateFood = () => {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };

    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
};

// Draw
const draw = () => {
    const styles = getComputedStyle(document.documentElement);
    const gridBg = styles.getPropertyValue('--grid-bg').trim();
    const neonPink = styles.getPropertyValue('--neon-pink').trim();
    const neonBlue = styles.getPropertyValue('--neon-blue').trim();
    const neonPurple = styles.getPropertyValue('--neon-purple').trim();
    const neonGreen = styles.getPropertyValue('--neon-green').trim();

    ctx.fillStyle = gridBg;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = neonBlue;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = Math.max(1, Math.floor(cellSize * 0.03));
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    snake.forEach((segment, index) => {
        const alpha = 1 - (index / snake.length) * 0.4;
        ctx.globalAlpha = alpha;

        if (index === 0) {
            const headGradient = ctx.createRadialGradient(
                segment.x * cellSize + cellSize / 2,
                segment.y * cellSize + cellSize / 2,
                0,
                segment.x * cellSize + cellSize / 2,
                segment.y * cellSize + cellSize / 2,
                cellSize
            );
            headGradient.addColorStop(0, neonPink);
            headGradient.addColorStop(1, neonPurple);
            ctx.fillStyle = headGradient;

            const pad = Math.max(2, Math.floor(cellSize * 0.1));
            ctx.fillRect(segment.x * cellSize + pad, segment.y * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2);

            ctx.shadowBlur = Math.min(8, Math.floor(cellSize * 0.4));
            ctx.shadowColor = neonPink;
            ctx.fillRect(segment.x * cellSize + pad, segment.y * cellSize + pad, cellSize - pad * 2, cellSize - pad * 2);
        } else {
            ctx.fillStyle = neonBlue;
            const pad = Math.max(1, Math.floor(cellSize * 0.15));
            const size = cellSize - pad * 2;
            ctx.fillRect(segment.x * cellSize + pad, segment.y * cellSize + pad, size, size);

            ctx.shadowBlur = Math.min(4, Math.floor(cellSize * 0.2));
            ctx.shadowColor = `rgba(0, 245, 253, ${alpha * 0.6})`;
            ctx.fillRect(segment.x * cellSize + pad, segment.y * cellSize + pad, size, size);
        }
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    const foodSize = Math.max(6, Math.floor(cellSize * 0.6));
    const x = food.x * cellSize + cellSize / 2;
    const y = food.y * cellSize + cellSize / 2;

    ctx.shadowBlur = 6;
    ctx.shadowColor = neonGreen;
    ctx.fillStyle = neonGreen;
    ctx.beginPath();
    ctx.arc(x, y, foodSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, foodSize / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
};

// Update
const update = () => {
    if (!isGameRunning || isPaused) return;

    if (directionQueue.length > 0) {
        const newDir = directionQueue.shift();
        if (direction.x === 0 || newDir.x === 0) {
            if (direction.y === 0 || newDir.y === 0) {
                direction = newDir;
            }
        }
    }

    let head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    if (head.x < 0) head.x = TILE_COUNT - 1;
    if (head.x >= TILE_COUNT) head.x = 0;
    if (head.y < 0) head.y = TILE_COUNT - 1;
    if (head.y >= TILE_COUNT) head.y = 0;

    for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        const newLevel = getLevelFromScore(score);
        if (newLevel > level) {
            level = newLevel;
            gameSpeed = Math.max(60, 150 - (level - 1) * 10);
            clearInterval(gameLoop);
            gameLoop = setInterval(gameStep, gameSpeed);

            if (window.appSettings?.vibration && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            if (window.soundManager) window.soundManager.play('levelup');
        }

        updateUI();
        generateFood();

        if (window.soundManager) window.soundManager.play('eat');
        if (window.appSettings?.vibration && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } else {
        snake.pop();
    }
};

const gameStep = () => {
    update();
    draw();
};

// Start game
const startGame = () => {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    directionQueue = [];
    score = 0;
    level = 1;
    gameSpeed = 150;
    isGameRunning = true;
    isPaused = false;

    generateFood();
    updateUI();

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, gameSpeed);

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').classList.remove('show');
    document.getElementById('pauseScreen').classList.remove('show');
    document.getElementById('pauseBtn').classList.add('show');

    if (window.soundManager) window.soundManager.play('start');
};

// Game over
const gameOver = () => {
    isGameRunning = false;
    isPaused = false;
    clearInterval(gameLoop);
    document.getElementById('pauseBtn').classList.remove('show');

    totalGames++;
    totalScore += score;

    if (score > highScore) {
        highScore = score;
    }

    // Сохраняем в localStorage ВСЕГДА (и для гостей, и для авторизованных)
    localStorage.setItem('snakeHighScore', highScore);
    localStorage.setItem('totalGames', totalGames);
    localStorage.setItem('totalScore', totalScore);

    console.log('💾 Stats saved to localStorage:', { highScore, totalGames, totalScore });

    // Для авторизованных пользователей сохраняем в облако
    if (typeof savePersonalStats === 'function' && APP_USER_ID) {
        savePersonalStats({ highScore, totalGames, totalScore });
    }

    // Отправка результата в лидерборд (только для авторизованных)
    if (typeof saveScoreToLeaderboard === 'function') {
        saveScoreToLeaderboard(score, level);
    } else {
        console.warn('saveScoreToLeaderboard is not available');
    }

    document.getElementById('finalScore').textContent = score;

    const levelUpNotice = document.getElementById('levelUpNotice');
    if (level > 1) {
        levelUpNotice.textContent = `⚡ Reached Level ${level}!`;
        levelUpNotice.style.display = 'block';
    } else {
        levelUpNotice.style.display = 'none';
    }

    document.getElementById('gameOver').classList.add('show');

    if (window.soundManager) window.soundManager.play('gameover');
    if (window.appSettings?.vibration && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
};

// Controls
const queueDirection = (newDir) => {
    if (directionQueue.length < 2) {
        const lastDir = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : direction;
        if ((lastDir.x === 0 || newDir.x === 0) && (lastDir.y === 0 || newDir.y === 0)) {
            if (!(lastDir.x === -newDir.x && lastDir.y === -newDir.y)) {
                directionQueue.push(newDir);
            }
        }
    }
};

const togglePause = () => {
    if (!isGameRunning) return;
    isPaused = !isPaused;

    if (isPaused) {
        document.getElementById('pauseScore').textContent = score;
        document.getElementById('pauseLevel').textContent = level;
        document.getElementById('pauseScreen').classList.add('show');
        document.getElementById('pauseBtn').textContent = '▶';
    } else {
        document.getElementById('pauseScreen').classList.remove('show');
        document.getElementById('pauseBtn').textContent = '⏸';
    }

    if (window.soundManager) window.soundManager.play(isPaused ? 'pause' : 'resume');
    if (window.appSettings?.vibration && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
};

const quitGame = () => {
    const confirmed = tg?.confirm
        ? tg.confirm('Are you sure you want to quit and close the game?')
        : confirm('Quit and close the app?');

    if (!confirmed) return;

    gameOver();
    document.getElementById('pauseScreen').classList.remove('show');

    setTimeout(() => {
        if (tg?.close) {
            tg.close();
        }
    }, 300);
};

// === Share result ===
const shareScore = () => {
    const isRecord = score >= highScore;

    // Формируем сообщение
    let message = `🎮 I just played Neon Snake!\n\n`;
    message += `🎯 Score: ${score.toLocaleString()}\n`;
    message += `⚡ Level: ${level}\n`;

    if (isRecord) {
        message += `\n🏆 NEW PERSONAL RECORD! 🎉\n`;
    }

    message += `\nCan you beat me? Try it now!`;

    try {
        // 1. Попытка использовать Telegram WebApp share (внутри Telegram)
        if (tg?.share) {
            tg.share(message);
        }
        // 2. Fallback: открыть диалог шаринга через t.me ссылку
        else {
            const gameUrl = 'https://t.me/vazovskyapps_bot/neonsnake';
            const encodedMessage = encodeURIComponent(message + '\n\n' + gameUrl);
            const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodedMessage}`;

            // Открываем в новом окне
            window.open(telegramShareUrl, '_blank');

            if (typeof showSnackbar === 'function') {
                showSnackbar("Opening Telegram share...", "info");
            }
        }
    } catch (e) {
        console.error('Share failed', e);

        // Последний fallback: копируем в буфер
        const gameUrl = 'https://t.me/vazovskyapps_bot/neonsnake';
        const fullMessage = message + '\n\n' + gameUrl;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullMessage)
                .then(() => {
                    if (typeof showSnackbar === 'function') {
                        showSnackbar("Message copied! Share it in Telegram", "info");
                    }
                })
                .catch(() => {
                    if (typeof showSnackbar === 'function') {
                        showSnackbar("Share failed", "error");
                    }
                });
        }
    }

    // Haptic & sound feedback
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }

    if (window.soundManager) {
        window.soundManager.play('click');
    }
};

document.getElementById('shareScoreBtn')?.addEventListener('click', () => {
    shareScore();
});

// === UI & Safe Area ===
updateUI();

const updateSafeArea = () => {
    const insets = tg?.safeAreaInsets || { top: 0, bottom: 0, left: 0, right: 0 };
    document.documentElement.style.setProperty('--safe-area-top', `${insets.top}px`);
    document.documentElement.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
    document.documentElement.style.setProperty('--safe-area-left', `${insets.left}px`);
    document.documentElement.style.setProperty('--safe-area-right', `${insets.right}px`);
};

// === Инициализация ===
tg.ready();
updateSafeArea();
window.addEventListener('resize', updateSafeArea);

if (typeof tg.disableVerticalSwipes === 'function') {
    try { tg.disableVerticalSwipes(); } catch (e) { console.warn('disableVerticalSwipes failed', e); }
}

// === Инициализация UI и обработчиков ===
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof initPersonalStats === 'function') {
            initPersonalStats();
        }
    }, 200);

    document.getElementById('startBtn')?.addEventListener('click', () => {
        startGame();
        if (window.soundManager?.play && window.appSettings?.sound) {
            window.soundManager.play('click');
        }
        if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    });
});