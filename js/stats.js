// === Безопасные утилиты ===
const safeBtoa = (str) => {
    if (typeof btoa === 'function') {
        return btoa(str);
    }
    try {
        return Buffer.from(str, 'binary').toString('base64');
    } catch (e) {
        console.warn('Buffer not available', e);
        return '';
    }
};

// 🔁 Синхронизированная функция base64, максимально близкая к Node.js Buffer
const createHash = (userId, score, level, timestamp) => {
    const input = `${userId}:${score}:${level}:${timestamp}`;
    // Используем TextEncoder для совместимости
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
    // Конвертим в base64 вручную, как в Node.js
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).substr(0, 20);
};

const safeParse = (str) => {
    try {
        return str ? JSON.parse(str) : null;
    } catch (e) {
        console.warn('Failed to parse JSON', e);
        return null;
    }
};

const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('localStorage error', e);
    }
};

const loadFromCloudWithTimeout = (key) => {
    return new Promise((resolve) => {
        if (!window.loadFromCloud) {
            resolve(null);
            return;
        }
        const timer = setTimeout(() => resolve(null), 3000);
        try {
            window.loadFromCloud(key, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        } catch (e) {
            clearTimeout(timer);
            resolve(null);
        }
    });
};

// === Инициализация Telegram ===
const getTelegramUser = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user || null;
};

// === Глобальные переменные ===
const tgUser = getTelegramUser();
const APP_USER_ID = tgUser ? String(tgUser.id) : null;
const APP_USERNAME = tgUser
    ? [tgUser.first_name, tgUser.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Anonymous'
    : 'Guest';

// === Кэширование ===
let cachedLeaderboard = null;
let cachedLeaderboardTimestamp = 0;
const LEADERBOARD_CACHE_TTL = 30000; // 30 сек

let cachedPersonalStats = null;
let cachedPersonalStatsTimestamp = 0;
const PERSONAL_STATS_CACHE_TTL = 10000; // 10 сек

// === API URL ===
const API_URL = 'https://neon-snake-leaderboard.vercel.app';

// === Анти-спам ===
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL = 10000; // Должно быть >= MIN_INTERVAL на сервере (10 сек)

// === Загрузка лидерборда: API → Cloud → LocalStorage ===
const loadLeaderboard = async () => {
    const now = Date.now();
    if (cachedLeaderboard && now - cachedLeaderboardTimestamp < LEADERBOARD_CACHE_TTL) {
        return cachedLeaderboard;
    }

    let leaderboard = [];

    try {
        const res = await fetch(`${API_URL}/api/leaderboard`, {
            method: 'GET',
            cache: 'no-cache'  // ← всегда свежий запрос
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                leaderboard = data;
                if (typeof showSnackbar === 'function') {
                    if (leaderboard.length === 0) {
                        showSnackbar('No scores yet', 'info');
                    } else if (lastLeaderboardLength !== leaderboard.length) {
                        showSnackbar(`Top ${leaderboard.length} players loaded`, 'success');
                    }
                }
                lastLeaderboardLength = leaderboard.length;
            }
        }
    } catch (e) {
        console.warn('API failed', e);
    }

    // 2. CloudStorage fallback
    if (leaderboard.length === 0) {
        try {
            const data = await loadFromCloudWithTimeout('leaderboard');
            const parsed = safeParse(data);
            if (Array.isArray(parsed)) leaderboard = parsed;
        } catch (e) { }
    }

    // 3. localStorage fallback
    if (leaderboard.length === 0) {
        try {
            const saved = localStorage.getItem('snakeLeaderboard');
            const parsed = safeParse(saved);
            if (Array.isArray(parsed)) leaderboard = parsed;
        } catch (e) { }
    }

    // Сортировка и кэширование
    const sorted = leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);

    cachedLeaderboard = sorted;
    cachedLeaderboardTimestamp = now;
    return sorted;
};

// === Загрузка личной статистики ===
const loadPersonalStats = async () => {
    if (!APP_USER_ID) return null;

    const now = Date.now();
    if (cachedPersonalStats && now - cachedPersonalStatsTimestamp < PERSONAL_STATS_CACHE_TTL) {
        return cachedPersonalStats;
    }

    let stats = null;

    // 1. Загрузка с API (без кэширования)
    try {
        const res = await fetch(`${API_URL}/api/score?userId=${APP_USER_ID}`, {
            method: 'GET',
            cache: 'no-cache',  // ← Ключевое: не использовать 304 из кэша
            headers: {
                'Cache-Control': 'no-cache'  // ← Дополнительная страховка
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.score !== undefined) {
                stats = {
                    highScore: data.score || 0,
                    totalGames: data.totalGames || 0,
                    totalScore: data.totalScore || 0,
                    lastUpdated: data.timestamp || now,
                    level: data.level || 1
                };
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Stats loaded from server', 'success');
                }
            }
        } else {
            console.warn('API /score returned', res.status);
        }
    } catch (e) {
        console.warn('API /score failed', e);
    }

    // 2. Fallback: CloudStorage → localStorage
    if (!stats) {
        try {
            const data = await loadFromCloudWithTimeout(`user_stats_${APP_USER_ID}`);
            const parsed = safeParse(data);
            if (parsed && parsed.highScore !== undefined) stats = parsed;
        } catch (e) { }
    }

    if (!stats) {
        try {
            const highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
            const totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
            const totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
            if (highScore || totalGames || totalScore) {
                stats = { highScore, totalGames, totalScore, lastUpdated: now };
            }
        } catch (e) { }
    }

    cachedPersonalStats = stats;
    cachedPersonalStatsTimestamp = now;
    return stats;
};

// === Сохранение результата ===
const saveScoreToLeaderboard = async (score, level) => {
    if (!APP_USER_ID || !APP_USERNAME) {
        if (typeof showSnackbar === 'function') showSnackbar('Guest can\'t save', 'info');
        return;
    }

    const now = Date.now();
    if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
        if (typeof showSnackbar === 'function') showSnackbar('Wait before saving...', 'warning');
        return;
    }

    const timestamp = now;
    const hash = createHash(APP_USER_ID, score, level, timestamp);

    const userData = {
        userId: APP_USER_ID,
        name: APP_USERNAME,
        score,
        level,
        timestamp,
        hash
    };

    try {
        const res = await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(userData),
            cache: 'no-cache'  // ← не кэшировать
        });

        if (res.ok) {
            cachedPersonalStats = null;  // ← Обновим при следующем чтении
            cachedLeaderboard = null;    // ← Обновим лидерборд
            lastSaveTime = now;

            if (typeof showSnackbar === 'function') {
                showSnackbar(`✅ Score saved: ${score}`, 'success');
            }
        } else {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || res.statusText;

            if (res.status === 429) {
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Too fast! Wait...', 'warning');
                }
            } else if (res.status === 400) {
                if (errorMsg.includes('hash') || errorMsg.includes('signature')) {
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Cheating detected', 'error');
                    }
                } else {
                    if (typeof showSnackbar === 'function') {
                        showSnackbar('Invalid data', 'error');
                    }
                }
            } else {
                // Ошибка сети или сервера → fallback
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Saving offline...', 'info');
                }
                await fallbackSaveToStorage(userData);
            }
        }
    } catch (e) {
        console.warn('Network error, saving offline', e);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Offline saved', 'info');
        }
        await fallbackSaveToStorage(userData);
    }

    // Обновление UI
    const modal = document.getElementById('statsModal');
    const activeTab = document.querySelector('.stats-tab.active');
    if (modal?.classList.contains('show') && activeTab?.dataset.tab === 'global') {
        const container = document.getElementById('statsContent');
        if (container) {
            const leaderboard = await loadLeaderboard();
            renderLeaderboard(leaderboard, container);
        }
    }
};

// === Fallback сохранение ===
const fallbackSaveToStorage = async (userData) => {
    if (!userData.userId) return;

    try {
        const leaderboard = await loadLeaderboard();
        const index = leaderboard.findIndex(p => p.userId === userData.userId);
        const updated = [...leaderboard];

        if (index === -1 || userData.score > (updated[index]?.score || 0)) {
            if (index === -1) {
                updated.push(userData);
            } else {
                updated[index] = userData;
            }

            const final = updated
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);

            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud('leaderboard', JSON.stringify(final));
            }
            safeSetItem('snakeLeaderboard', JSON.stringify(final));

            cachedLeaderboard = final;
            cachedLeaderboardTimestamp = Date.now();

            if (typeof showSnackbar === 'function') {
                showSnackbar('Saved offline', 'info');
            }
        }
    } catch (e) {
        try {
            const local = safeParse(localStorage.getItem('snakeLeaderboard')) || [];
            const filtered = local.filter(p => p.userId !== userData.userId);
            filtered.push(userData);
            const saved = filtered
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);
            safeSetItem('snakeLeaderboard', JSON.stringify(saved));
            if (typeof showSnackbar === 'function') {
                showSnackbar('Saved locally', 'info');
            }
        } catch (e2) {
            if (typeof showSnackbar === 'function') {
                showSnackbar('Save failed', 'error');
            }
        }
    }
};

// === Сохранение личной статистики ===
const savePersonalStats = async (stats) => {
    if (!APP_USER_ID || !stats) return;

    try {
        if (typeof window.saveToCloud === 'function') {
            window.saveToCloud(`user_stats_${APP_USER_ID}`, JSON.stringify(stats));
        }
        safeSetItem('snakeHighScore', stats.highScore);
        safeSetItem('totalGames', stats.totalGames);
        safeSetItem('totalScore', stats.totalScore);
        cachedPersonalStats = { ...stats };
        if (typeof showSnackbar === 'function') {
            showSnackbar('Stats saved', 'success');
        }
    } catch (e) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Failed to save', 'error');
        }
    }
};

// === Рендер лидерборда ===
// === Рендер лидерборда ===
const renderLeaderboard = (leaderboard, container) => {
    if (!container) return;

    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--neon-blue); opacity: 0.8;">
                <p style="font-family: 'Orbitron', sans-serif; font-size: 18px; margin-bottom: 10px;">🏆 No scores yet</p>
                <p style="font-size: 14px;">Be the first to set a record!</p>
            </div>
        `;
        return;
    }

    let html = '<div class="leaderboard">';
    leaderboard.slice(0, 50).forEach((entry, index) => {
        const rank = index + 1;
        const isYou = entry.userId === APP_USER_ID;

        // Проверяем, удалён ли пользователь
        const isDeleted = entry.deletedAt || (entry.score === 0 && entry.timestamp < Date.now() - 60000);
        const displayName = isDeleted ? '[deleted]' : entry.name;

        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

        html += `
            <div class="leaderboard-item ${isYou ? 'current-user' : ''} ${isDeleted ? 'deleted' : ''}">
                <div class="rank" style="color:${rank <= 3 ? 'var(--neon-yellow)' : ''}">${medal}</div>
                <div class="player-info">
                    <div class="player-name">${isDeleted ? '<span style="opacity: 0.5; font-style: italic;">[deleted]</span>' : displayName}${isYou && !isDeleted ? ' (You)' : ''}</div>
                    ${isDeleted ? '' : `<div class="player-level">Level ${entry.level}</div>`}
                </div>
                <div class="player-score">${isDeleted ? '-' : entry.score.toLocaleString()}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// === Рендер личной статистики ===
const renderPersonalStats = async (container) => {
    if (!container) return;

    const stats = await loadPersonalStats();
    const highScore = stats?.highScore || 0;
    const totalGames = stats?.totalGames || 0;
    const totalScore = stats?.totalScore || 0;
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

    let guestNotice = '';
    if (!getTelegramUser()) {
        const webUrl = 'https://t.me/vazovskyapps_bot/neonsnake';
        const tgUrl = 'tg://resolve?domain=vazovskyapps_bot&appname=neonsnake';

        const m = navigator.language.startsWith('ru')
            ? { sync: 'Играйте в Telegram для синхронизации', open: 'Открыть в Telegram' }
            : { sync: 'Play in Telegram for full sync', open: 'Open in Telegram' };

        guestNotice = `
            <p style="color: var(--neon-red); font-size: 12px; margin-top: 10px; opacity: 0.9;">
                📱 ${m.sync}
            </p>
            <a href="${webUrl}" target="_blank" rel="noopener"
               style="display: inline-block; margin-top: 8px; padding: 8px 14px; font: bold 13px 'Orbitron'; color: var(--neon-blue); 
                      border: 2px solid var(--neon-blue); border-radius: 6px; background: transparent; text-decoration: none;
                      text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 0 8px rgba(0,255,255,0.5); transition: all 0.3s ease;"
               onmouseover="this.style.boxShadow='0 0 14px rgba(0,255,255,0.8)'; this.style.transform='scale(1.05)';"
               onmouseout="this.style.boxShadow='0 0 8px rgba(0,255,255,0.5)'; this.style.transform='scale(1)';">
                ${m.open}
            </a>
        `;
    }

    container.innerHTML = `
        <div class="stats-info">
            <div class="stats-grid">
                <div class="stat-item"><div class="stat-item-label">Best Score</div><div class="stat-item-value">${highScore.toLocaleString()}</div></div>
                <div class="stat-item"><div class="stat-item-label">Total Games</div><div class="stat-item-value">${totalGames}</div></div>
                <div class="stat-item"><div class="stat-item-label">Total Score</div><div class="stat-item-value">${totalScore.toLocaleString()}</div></div>
                <div class="stat-item"><div class="stat-item-label">Avg Score</div><div class="stat-item-value">${avgScore.toLocaleString()}</div></div>
            </div>
            <div style="text-align: center; padding: 20px; color: var(--neon-purple); font-size: 14px;">
                <p style="margin-bottom: 5px;">👤 ${APP_USERNAME}</p>
                <p style="opacity: 0.7;">Keep playing to climb the ranks!</p>
                ${guestNotice}
            </div>
        </div>
    `;
};

// === UI: Открытие модалки ===
document.getElementById('statsBtn')?.addEventListener('click', async () => {
    if (window.soundManager?.play) window.soundManager.play('click');
    if (window.isGameRunning && !window.isPaused && window.togglePause) window.togglePause();

    const modal = document.getElementById('statsModal');
    if (!modal) return;
    modal.classList.add('show');

    const activeTab = document.querySelector('.stats-tab.active')?.dataset.tab;
    const content = document.getElementById('statsContent');
    if (!content) return;

    if (activeTab === 'global') {
        content.innerHTML = '<div class="loading">Loading...</div>';
        const leaderboard = await loadLeaderboard();
        renderLeaderboard(leaderboard, content);
    } else {
        await renderPersonalStats(content);
    }

    const tg = window.Telegram?.WebApp;
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
});

// === Переключение вкладок ===
document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
        document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const content = document.getElementById('statsContent');
        if (tab.dataset.tab === 'global') {
            content.innerHTML = '<div class="loading">Loading...</div>';
            const leaderboard = await loadLeaderboard();
            renderLeaderboard(leaderboard, content);
        } else {
            await renderPersonalStats(content);
        }
    });
});

// === Закрытие модалки ===
document.getElementById('statsCloseBtn')?.addEventListener('click', () => {
    document.getElementById('statsModal')?.classList.remove('show');
});

document.getElementById('statsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'statsModal') {
        e.target.classList.remove('show');
    }
});

// === Экспорт ===
window.loadPersonalStats = loadPersonalStats;
window.savePersonalStats = savePersonalStats;
window.saveScoreToLeaderboard = saveScoreToLeaderboard;
window.loadLeaderboard = loadLeaderboard;
