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
            console.warn('loadFromCloud not available');
            resolve(null);
            return;
        }

        const timer = setTimeout(() => {
            console.warn('loadFromCloud timeout (3s)');
            resolve(null);
        }, 3000);

        try {
            window.loadFromCloud(key, (data) => {
                clearTimeout(timer);
                resolve(data);
            });
        } catch (e) {
            clearTimeout(timer);
            console.warn('loadFromCloud error', e);
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
const APP_USER_ID = getTelegramUser() ? String(getTelegramUser().id) : null;
const APP_USER_NAME = getTelegramUser()
    ? [getTelegramUser().first_name, getTelegramUser().last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Anonymous'
    : 'Guest';

// === Кэширование ===
let cachedLeaderboard = null;
let cachedLeaderboardTimestamp = 0;
const LEADERBOARD_CACHE_TTL = 30000; // 30 секунд

let cachedPersonalStats = null;
let cachedPersonalStatsTimestamp = 0;
const PERSONAL_STATS_CACHE_TTL = 10000; // 10 секунд

// === Бэкенд API URL ===
const API_URL = 'https://neon-snake-leaderboard.vercel.app';

// === Анти-спам: нельзя отправлять чаще 1 раза в 5 сек ===
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL = 5000;

// === Загрузка лидерборда: API → CloudStorage → localStorage ===
const loadLeaderboard = async () => {
    const now = Date.now();
    if (cachedLeaderboard && (now - cachedLeaderboardTimestamp < LEADERBOARD_CACHE_TTL)) {
        return cachedLeaderboard;
    }

    let leaderboard = [];

    // 1. Попытка загрузить из API
    try {
        const res = await fetch(`${API_URL}/api/leaderboard`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                leaderboard = data;
                console.log('Leaderboard from API');
                if (typeof showSnackbar === 'function') {
                    if (leaderboard.length === 0) {
                        showSnackbar('No scores yet', 'info');
                    } else {
                        showSnackbar(`Top ${leaderboard.length} players loaded`, 'success');
                    }
                }

                const sorted = leaderboard
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 100);

                cachedLeaderboard = sorted;
                cachedLeaderboardTimestamp = now;
                return sorted;
            }
        } else {
            throw new Error(`API error: ${res.status}`);
        }
    } catch (e) {
        console.warn('API failed, fallback to CloudStorage', e);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Cloud storage: loading...', 'info');
        }
    }

    // 2. CloudStorage fallback
    if (leaderboard.length === 0) {
        try {
            const data = await loadFromCloudWithTimeout('leaderboard');
            const parsed = safeParse(data);
            if (Array.isArray(parsed)) {
                leaderboard = parsed;
                console.log('Leaderboard from CloudStorage');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Loaded from cloud', 'info');
                }
            }
        } catch (e) {
            console.warn('CloudStorage failed, fallback to localStorage', e);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Loading local data...', 'warning');
            }
        }
    }

    // 3. localStorage fallback
    if (leaderboard.length === 0) {
        try {
            const saved = localStorage.getItem('snakeLeaderboard');
            const parsed = safeParse(saved);
            if (Array.isArray(parsed)) {
                leaderboard = parsed;
                console.log('Leaderboard from localStorage');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Using local data', 'info');
                }
            }
        } catch (e) {
            console.warn('localStorage failed', e);
            if (typeof showSnackbar === 'function') {
                showSnackbar('No saved scores found', 'error');
            }
        }
    }

    const sorted = Array.isArray(leaderboard)
        ? leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 100)
        : [];

    cachedLeaderboard = sorted;
    cachedLeaderboardTimestamp = now;
    return sorted;
};

// === Загрузка личной статистики: API → CloudStorage → localStorage ===
const loadPersonalStats = async () => {
    if (!APP_USER_ID) return null;

    const now = Date.now();
    if (cachedPersonalStats && now - cachedPersonalStatsTimestamp < PERSONAL_STATS_CACHE_TTL) {
        return cachedPersonalStats;
    }

    let stats = null;

    // 1. Попытка загрузить из API
    try {
        const res = await fetch(`${API_URL}/api/score?userId=${APP_USER_ID}`);
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.score !== 'undefined') {
                stats = {
                    highScore: data.score || 0,
                    totalGames: data.totalGames || 0,
                    totalScore: data.totalScore || 0,
                    lastUpdated: data.timestamp || Date.now()
                };
                console.log('✅ Personal stats from API');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Stats loaded', 'success');
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ API stats failed → fallback to CloudStorage', e);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Syncing from cloud...', 'info');
        }
    }

    // 2. CloudStorage fallback
    if (!stats) {
        try {
            const data = await loadFromCloudWithTimeout(`user_stats_${APP_USER_ID}`);
            const parsed = safeParse(data);
            if (parsed && typeof parsed.highScore !== 'undefined') {
                stats = parsed;
                console.log('✅ Personal stats from CloudStorage');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Loaded from cloud', 'info');
                }
            }
        } catch (e) {
            console.warn('⚠️ CloudStorage stats failed → fallback to localStorage', e);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Local stats loaded', 'info');
            }
        }
    }

    // 3. localStorage fallback
    if (!stats) {
        try {
            const highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
            const totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
            const totalScore = parseInt(localStorage.getItem('totalScore')) || 0;

            if (highScore > 0 || totalGames > 0 || totalScore > 0) {
                stats = {
                    highScore,
                    totalGames,
                    totalScore,
                    lastUpdated: Date.now()
                };
                console.log('✅ Personal stats from localStorage');
                if (typeof showSnackbar === 'function') {
                    showSnackbar('Local stats loaded', 'info');
                }
            }
        } catch (e) {
            console.warn('⚠️ localStorage stats failed', e);
        }
    }

    cachedPersonalStats = stats;
    cachedPersonalStatsTimestamp = now;
    return stats;
};

// === Сохранение в лидерборд с защитой ===
const saveScoreToLeaderboard = async (score, level) => {
    if (!APP_USER_ID || !APP_USERNAME) {
        if (typeof showSnackbar === 'function') showSnackbar('Guest can\'t save', 'info');
        return;
    }

    const now = Date.now();
    if (now - lastSaveTime < MIN_SAVE_INTERVAL) {
        console.warn('Too fast! Wait...');
        if (typeof showSnackbar === 'function') showSnackbar('Wait before saving again', 'warning');
        return;
    }

    const userData = {
        userId: APP_USER_ID,
        name: APP_USERNAME,
        score,
        level,
        timestamp: now,
        hash: safeBtoa(`${APP_USER_ID}:${score}:${level}:${now}`).substr(0, 20)
    };

    try {
        const res = await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (res.ok) {
            cachedLeaderboard = null;
            lastSaveTime = now;
            if (typeof showSnackbar === 'function') showSnackbar(`✅ Score saved: ${score}`, 'success');
        } else {
            throw new Error('API rejected');
        }
    } catch (e) {
        console.warn('API failed, saving locally', e);
        if (typeof showSnackbar === 'function') showSnackbar('💾 Saving offline...', 'info');
        await fallbackSaveToStorage(userData);
    }

    // UI refresh
    const modal = document.getElementById('statsModal');
    const activeTab = document.querySelector('.stats-tab.active');
    if (modal?.classList.contains('show') && activeTab?.dataset.tab === 'global') {
        const container = document.getElementById('statsContent');
        if (container) {
            const leaderboard = await loadLeaderboard();
            if (document.querySelector('.stats-tab.active')?.dataset.tab === 'global') {
                renderLeaderboard(leaderboard, container);
            }
        }
    }
};

// === Fallback: если API недоступен ===
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

            cachedLeaderboard = final;
            cachedLeaderboardTimestamp = Date.now();

            safeSetItem('snakeLeaderboard', JSON.stringify(final));
            console.log('💾 Saved to CloudStorage & localStorage');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Synced offline', 'info');
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
            console.log('💾 Saved to localStorage');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Saved locally', 'info');
            }
        } catch (e2) {
            console.error('❌ All save methods failed');
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
            window.saveToCloud(`user_stats_${APP_USER_ID}`, JSON.stringify({
                ...stats,
                lastUpdated: Date.now(),
            }));
        }
        cachedPersonalStats = { ...stats, lastUpdated: Date.now() };
        console.log('✅ Personal stats saved to CloudStorage');
        if (typeof showSnackbar === 'function') {
            showSnackbar('Profile saved', 'success');
        }
    } catch (e) {
        try {
            safeSetItem('snakeHighScore', String(stats.highScore || 0));
            safeSetItem('totalGames', String(stats.totalGames || 0));
            safeSetItem('totalScore', String(stats.totalScore || 0));
            console.log('✅ Personal stats saved to localStorage');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Saved locally', 'info');
            }
        } catch (e2) {
            console.error('❌ Failed to save personal stats');
            if (typeof showSnackbar === 'function') {
                showSnackbar('Save failed', 'error');
            }
        }
    }
};

// === Рендер лидерборда ===
const renderLeaderboard = (leaderboard, container) => {
    if (!container || !document.querySelector('.stats-tab.active')?.dataset.tab === 'global') return;

    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--neon-blue); opacity: 0.8;">
                <p style="font-family: 'Orbitron', sans-serif; font-size: 18px; margin-bottom: 10px;">
                    🏆 No scores yet
                </p>
                <p style="font-size: 14px;">Be the first to set a record!</p>
            </div>
        `;
        return;
    }

    let html = '<div class="leaderboard">';
    leaderboard.slice(0, 50).forEach((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = entry.userId === APP_USER_ID;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

        html += `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank" style="color: ${rank <= 3 ? 'var(--neon-yellow)' : ''};">${medal}</div>
                <div class="player-info">
                    <div class="player-name">${entry.name}${isCurrentUser ? ' (You)' : ''}</div>
                    <div class="player-level">Level ${entry.level}</div>
                </div>
                <div class="player-score">${entry.score.toLocaleString()}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// === Рендер личной статистики ===
const renderPersonalStats = async (container) => {
    if (!container) return;

    let stats = null;
    let highScore = 0;
    let totalGames = 0;
    let totalScore = 0;
    let avgScore = 0;

    // Для авторизованных пользователей загружаем из облака/API
    if (APP_USER_ID) {
        stats = await loadPersonalStats();
        if (stats) {
            highScore = stats.highScore || 0;
            totalGames = stats.totalGames || 0;
            totalScore = stats.totalScore || 0;
        }
    }

    // Для гостей или если не удалось загрузить - берем из localStorage
    if (!stats) {
        try {
            highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
            totalGames = parseInt(localStorage.getItem('totalGames')) || 0;
            totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
            console.log('📊 Guest stats from localStorage:', { highScore, totalGames, totalScore });
        } catch (e) {
            console.warn('⚠️ Failed to load guest stats from localStorage', e);
        }
    }

    avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

    let guestNotice = '';
    if (!getTelegramUser()) {
        const telegramUrl = 'https://t.me/vazovskyapps_bot/neonsnake';
        guestNotice = `
            <p style="color: var(--neon-red); font-size: 12px; margin-top: 10px; opacity: 0.9;">
                📱 Play in Telegram for full sync
            </p>
            <a 
                href="${telegramUrl}" 
                target="_blank"
                style="
                    display: inline-block;
                    margin-top: 10px;
                    padding: 8px 16px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 14px;
                    font-weight: bold;
                    color: var(--neon-blue);
                    background: transparent;
                    border: 2px solid var(--neon-blue);
                    border-radius: 6px;
                    text-decoration: none;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    box-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.boxShadow='0 0 14px rgba(0, 255, 255, 0.8)'; this.style.transform='scale(1.05)';"
                onmouseout="this.style.boxShadow='0 0 8px rgba(0, 255, 255, 0.5)'; this.style.transform='scale(1)';"
            >
                Open in Telegram
            </a>
        `;
    }

    container.innerHTML = `
    <div class="stats-info">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-item-label">Best Score</div>
          <div class="stat-item-value">${highScore.toLocaleString()}</div>
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
        <p style="margin-bottom: 5px;">👤 ${APP_USER_NAME}</p>
        <p style="opacity: 0.7;">Keep playing to climb the ranks!</p>
        ${guestNotice}
      </div>
    </div>
  `;
};

// === UI: открытие / переключение ===
document.getElementById('statsBtn')?.addEventListener('click', async () => {
    if (window.soundManager && typeof window.soundManager.play === 'function') {
        window.soundManager.play('click');
    }
    if (window.isGameRunning && !window.isPaused && typeof window.togglePause === 'function') {
        window.togglePause();
    }

    const modal = document.getElementById('statsModal');
    if (!modal) return;
    modal.classList.add('show');

    const tab = document.querySelector('.stats-tab.active');
    const content = document.getElementById('statsContent');

    if (tab?.dataset.tab === 'global') {
        content.innerHTML = '<div class="loading">Loading...</div>';
        const leaderboard = await loadLeaderboard();
        if (document.querySelector('.stats-tab.active')?.dataset.tab === 'global') {
            renderLeaderboard(leaderboard, content);
        }
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
            if (document.querySelector('.stats-tab.active')?.dataset.tab === 'global') {
                renderLeaderboard(leaderboard, content);
            }
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
