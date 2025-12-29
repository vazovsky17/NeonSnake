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

const createHash = (userId, score, level, timestamp) => {
    const input = `${userId}:${score}:${level}:${timestamp}`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(input);
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

// === Telegram User ===
const getTelegramUser = () => {
    const tg = window.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user || null;
};

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
const MIN_SAVE_INTERVAL = 10000; // Должно совпадать с сервером

// === Загрузка лидерборда: API → Cloud → LocalStorage ===
const loadLeaderboard = async () => {
    const now = Date.now();
    if (cachedLeaderboard && now - cachedLeaderboardTimestamp < LEADERBOARD_CACHE_TTL) {
        cachedLeaderboard._source = 'Cache';
        return cachedLeaderboard;
    }

    let leaderboard = [];
    let source = 'Local';

    try {
        const res = await fetch(`${API_URL}/api/leaderboard`, {
            method: 'GET',
            cache: 'no-cache'
        });

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                leaderboard = data;
                source = 'API';
                if (typeof showSnackbar === 'function') {
                    if (leaderboard.length === 0) {
                        showSnackbar('No scores yet', 'info');
                    } else {
                        showSnackbar(`Top ${leaderboard.length} players loaded`, 'success');
                    }
                }
            }
        }
    } catch (e) {
        console.warn('API leaderboard failed', e);
    }

    // Fallback: CloudStorage
    if (leaderboard.length === 0) {
        try {
            const data = await loadFromCloudWithTimeout('leaderboard');
            const parsed = safeParse(data);
            if (Array.isArray(parsed)) {
                leaderboard = parsed;
                source = 'Telegram';
            }
        } catch (e) { }
    }

    // Fallback: localStorage
    if (leaderboard.length === 0) {
        try {
            const saved = localStorage.getItem('snakeLeaderboard');
            const parsed = safeParse(saved);
            if (Array.isArray(parsed)) {
                leaderboard = parsed;
                source = 'Local';
            }
        } catch (e) { }
    }

    // Сортируем по убыванию и ограничиваем до 100
    const sorted = leaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);

    cachedLeaderboard = sorted;
    cachedLeaderboardTimestamp = now;

    // Добавляем метку источника
    sorted._source = source;
    return sorted;
};

// === Загрузка личной статистики ===
const loadPersonalStats = async () => {
    if (!APP_USER_ID) return null;

    const now = Date.now();
    if (cachedPersonalStats && now - cachedPersonalStatsTimestamp < PERSONAL_STATS_CACHE_TTL) {
        cachedPersonalStats._source = 'Cache';
        return cachedPersonalStats;
    }

    let stats = null;
    let source = 'Local';

    try {
        const res = await fetch(`${API_URL}/api/score?userId=${APP_USER_ID}`, {
            method: 'GET',
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (res.ok) {
            const data = await res.json();
            stats = {
                highScore: data.score || 0,
                level: data.level || 1,
                totalGames: data.totalGames || 0,
                totalScore: data.totalScore || 0,
                lastUpdated: data.timestamp || now,
                deleted: !!data.deletedAt
            };
            source = 'API';
            if (typeof showSnackbar === 'function') {
                showSnackbar('Stats loaded from server', 'success');
            }
        }
    } catch (e) {
        console.warn('API /score failed', e);
    }

    // Fallback: Cloud
    if (!stats) {
        try {
            const cloud = await loadFromCloudWithTimeout(`user_stats_${APP_USER_ID}`);
            const parsed = safeParse(cloud);
            if (parsed && parsed.highScore !== undefined) {
                stats = parsed;
                source = 'Telegram';
            }
        } catch (e) { }
    }

    // Fallback: localStorage
    if (!stats) {
        try {
            const highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
            const totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
            const totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
            if (highScore || totalGames || totalScore) {
                stats = { highScore, totalGames, totalScore, lastUpdated: now };
                source = 'Local';
            }
        } catch (e) { }
    }

    cachedPersonalStats = stats;
    cachedPersonalStatsTimestamp = now;

    // Добавляем источник
    if (stats) stats._source = source;
    return stats;
};

// === Сохранение результата в лидерборд ===
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

    const userData = { userId: APP_USER_ID, name: APP_USERNAME, score, level, timestamp, hash };

    try {
        const res = await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify(userData),
            cache: 'no-cache'
        });

        if (res.ok) {
            // Успешно, сбросим кэш
            cachedPersonalStats = null;
            cachedLeaderboard = null;
            lastSaveTime = now;
            if (typeof showSnackbar === 'function') {
                showSnackbar(`✅ Score saved: ${score}`, 'success');
            }
        } else {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.error || res.statusText;

            if (res.status === 429) {
                if (typeof showSnackbar === 'function') showSnackbar('Too fast! Wait...', 'warning');
            } else if (res.status === 400 && (errorMsg.includes('hash') || errorMsg.includes('signature'))) {
                if (typeof showSnackbar === 'function') showSnackbar('Cheating detected', 'error');
            } else {
                if (typeof showSnackbar === 'function') showSnackbar('Saving offline...', 'info');
                await fallbackSaveToStorage(userData);
            }
        }
    } catch (e) {
        console.warn('Network error, saving offline', e);
        if (typeof showSnackbar === 'function') showSnackbar('Offline saved', 'info');
        await fallbackSaveToStorage(userData);
    }

    // Обновляем UI, если модалка открыта и активна
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

            // Сохраняем и в облако, и в localStorage
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud('leaderboard', JSON.stringify(final));
            }
            safeSetItem('snakeLeaderboard', JSON.stringify(final));

            // Обновляем кэш
            cachedLeaderboard = final;
            cachedLeaderboardTimestamp = Date.now();
        }
    } catch (e) {
        try {
            // Резервное сохранение в localStorage
            const local = safeParse(localStorage.getItem('snakeLeaderboard')) || [];
            const filtered = local.filter(p => p.userId !== userData.userId);
            filtered.push(userData);
            const saved = filtered
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);
            safeSetItem('snakeLeaderboard', JSON.stringify(saved));
        } catch (e2) {
            if (typeof showSnackbar === 'function') showSnackbar('Save failed', 'error');
        }
    }
};

// === Рендер лидерборда ===
const renderLeaderboard = (leaderboard, container) => {
    if (!container) return;

    const source = leaderboard._source || 'Local';

    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--neon-blue); opacity: 0.8;">
                <p style="font-family: 'Orbitron', sans-serif; font-size: 18px; margin-bottom: 10px;">🏆 No scores yet</p>
                <p style="font-size: 14px;">Be the first to set a record!</p>
                <div style="margin-top: 10px;"><span class="data-source-tag">${source}</span></div>
            </div>
        `;
        return;
    }

    let html = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
            <span class="data-source-tag">${source}</span>
        </div>
        <div class="leaderboard">
    `;

    leaderboard.slice(0, 50).forEach((entry, index) => {
        const rank = index + 1;
        const isYou = entry.userId === APP_USER_ID;
        const isDeleted = !!entry.deletedAt;

        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const displayName = isDeleted ? '[deleted]' : entry.name;

        html += `
            <div class="leaderboard-item ${isYou ? 'current-user' : ''} ${isDeleted ? 'deleted' : ''}">
                <div class="rank" style="color:${rank <= 3 ? 'var(--neon-yellow)' : ''}">${medal}</div>
                <div class="player-info">
                    <div class="player-name">
                        ${isDeleted
                ? '<span style="opacity: 0.6; font-style: italic;">[deleted]</span>'
                : displayName}
                        ${!isDeleted && isYou ? ' <span style="color:var(--neon-cyan); font-size:12px;">(You)</span>' : ''}
                    </div>
                    ${isDeleted ? '' : `<div class="player-level">Level ${entry.level}</div>`}
                </div>
                <div class="player-score">${isDeleted ? '–' : entry.score.toLocaleString()}</div>
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
    const source = stats?._source || 'Local';

    const highScore = stats?.highScore || 0;
    const totalGames = stats?.totalGames || 0;
    const totalScore = stats?.totalScore || 0;
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
    const isDeleted = stats?.deleted;

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
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; margin-top: -10px;">
            <span class="data-source-tag">${source}</span>
        </div>
        <div class="stats-info">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-item-label">Best Score</div>
                    <div class="stat-item-value">${isDeleted ? '–' : highScore.toLocaleString()}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">Total Games</div>
                    <div class="stat-item-value">${totalGames}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">Total Score</div>
                    <div class="stat-item-value">${totalScore.toLocaleString()}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-item-label">Avg Score</div>
                    <div class="stat-item-value">${avgScore.toLocaleString()}</div>
                </div>
            </div>
            <div style="text-align: center; padding: 20px; color: var(--neon-purple); font-size: 14px;">
                <p style="margin-bottom: 5px;">👤 ${isDeleted ? '<span style="opacity:0.6; font-style:italic;">[account deleted]</span>' : APP_USERNAME}</p>
                <p style="opacity: 0.7;">${isDeleted ? 'Your data is reset' : 'Keep playing to climb the ranks!'}</p>
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

// === Экспорт функций для внешнего использования ===
window.loadPersonalStats = loadPersonalStats;
window.savePersonalStats = savePersonalStats; // может быть не реализована, если не используется
window.saveScoreToLeaderboard = saveScoreToLeaderboard;
window.loadLeaderboard = loadLeaderboard;