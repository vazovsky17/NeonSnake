// src/services/StatsService.js

/**
 * Сервис статистики и лидерборда
 * Работает с:
 * - Личной статистикой (API + localStorage)
 * - Глобальным лидербордом
 * - Кэшированием
 * - Синхронизацией
 */
export default class StatsService {
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.storage = app.storage;
        this.user = app.user;

        // Конфигурация
        this.API_URL = 'https://neon-snake-leaderboard.vercel.app';
        this.LEADERBOARD_CACHE_TTL = 30000; // 30 сек
        this.PERSONAL_CACHE_TTL = 10000; // 10 сек

        // Кэш
        this._leaderboard = null;
        this._leaderboardTimestamp = 0;
        this._personalStats = null;
        this._personalStatsTimestamp = 0;

        // Анти-спам
        this._lastSaveTime = 0;
        this._minSaveInterval = 10000;

        this.bindEvents();
    }

    /**
     * Привязка к событиям
     */
    bindEvents() {
        // При смене пользователя — сброс кэша
        this.eventBus.on('user:loaded', (user) => {
            this.user = user;
            this.clearCache();
        });

        // При выходе из фона — авто-обновление
        this.eventBus.on('app:visible', () => {
            setTimeout(() => this.loadLeaderboard(), 500);
        });
    }

    // === 🏆 Работа с рекордом (Best Score) ===

    /**
     * Быстрое получение лучшего счёта
     * @returns {number}
     */
    getBestScore() {
        // 1. Из user (если уже загружен)
        if (this.user && typeof this.user.highScore !== 'undefined') {
            return this.user.highScore || 0;
        }

        // 2. Из localStorage
        try {
            const local = this.storage.loadSync?.(`user_stats_${this.user?.id}`);
            if (local) {
                return local.highScore || 0;
            }
        } catch (e) {
            console.warn('StatsService: не удалось прочитать bestScore из localStorage', e);
        }

        // 3. По умолчанию
        return 0;
    }

    /**
     * Сохраняет рекорд, если он новый
     * Используется в реальном времени в GameScreen
     * @param {number} score
     */
    saveBestScore(score) {
        if (!this.user) return;

        const currentBest = this.getBestScore();
        if (score <= currentBest) return;

        // Обновляем локально
        try {
            const stats = {
                highScore: score,
                totalGames: this.user.totalGames || 1,
                totalScore: (this.user.totalScore || 0) + score,
                level: this.user.level || 1,
                lastUpdated: Date.now()
            };

            this.storage.save(`user_stats_${this.user.id}`, stats);

            // Обновляем в user
            if (this.user.highScore < score) {
                this.user.highScore = score;
                this.eventBus.emit('user:update', this.user);
            }

            // Обновляем кэш
            this._personalStats = stats;
            this._personalStatsTimestamp = Date.now();
        } catch (e) {
            console.error('StatsService: не удалось сохранить bestScore', e);
        }
    }

    // === 📊 Личная статистика ===

    /**
     * Загружает личную статистику
     * Приоритет: API → localStorage → null
     * @returns {Promise<Object|null>}
     */
    async loadPersonalStats() {
        const now = Date.now();

        // 1. Кэш (если свежий)
        if (this._personalStats && now - this._personalStatsTimestamp < this.PERSONAL_CACHE_TTL) {
            this._personalStats._source = 'cache';
            return this._personalStats;
        }

        let stats = null;
        let source = 'local';

        // 2. API (только для авторизованных)
        if (this.user.isRegistered && !this.user.isDeleted) {
            try {
                const res = await fetch(`${this.API_URL}/api/score?userId=${this.user.id}`, {
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
                    source = 'api';
                }
            } catch (e) {
                console.warn('StatsService: API /score failed', e);
            }
        }

        // 3. Fallback: localStorage
        if (!stats) {
            try {
                const local = await this.storage.load(`user_stats_${this.user.id}`);
                if (local) {
                    stats = {
                        highScore: local.highScore || 0,
                        totalGames: local.totalGames || 0,
                        totalScore: local.totalScore || 0,
                        lastUpdated: local.lastUpdated || now
                    };
                    source = 'local';
                }
            } catch (e) {
                console.warn('StatsService: localStorage read failed', e);
            }
        }

        // Сохраняем в кэш
        this._personalStats = stats;
        this._personalStatsTimestamp = now;
        if (stats) stats._source = source;

        // Синхронизируем с локальным User
        if (stats && !stats.deleted) {
            this.user.applyStats(stats);
        }

        return stats;
    }

    /**
     * Сохраняет счёт на сервер
     * @param {number} score
     * @param {number} level
     */
    async saveScoreToLeaderboard(score, level) {
        if (!this.user.isRegistered) {
            console.log('StatsService: нельзя сохранить — нет пользователя');
            this.eventBus.emit('snackbar:show', {
                message: 'Play in Telegram to sync',
                type: 'info'
            });
            return;
        }

        const now = Date.now();
        if (now - this._lastSaveTime < this._minSaveInterval) {
            this.eventBus.emit('snackbar:show', {
                message: 'Wait before saving...',
                type: 'warning'
            });
            return;
        }

        // Нормализация
        score = Math.max(0, Number(score) || 0);
        level = Math.max(1, Number(level) || 1);

        // Хэш (упрощённый)
        const hash = btoa(`${this.user.id}:${score}:${level}:${now}`).substr(0, 20);
        const payload = {
            userId: this.user.id,
            name: this.user.fullName,
            username: this.user.username,
            score,
            level,
            timestamp: now,
            hash
        };

        try {
            const res = await fetch(`${this.API_URL}/api/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(payload),
                mode: 'cors'
            });

            if (res.ok) {
                this._lastSaveTime = now;
                this.clearCache('leaderboard');

                this.eventBus.emit('snackbar:show', {
                    message: `✅ Score saved: ${score}`,
                    type: 'success'
                });

                // Обновляем локальные данные
                await this.savePersonalStatsLocally({ score, level });
            } else {
                const error = await res.json().catch(() => ({}));
                if (res.status === 400 && error.error?.includes('hash')) {
                    this.eventBus.emit('snackbar:show', {
                        message: 'Cheating detected',
                        type: 'error'
                    });
                } else {
                    await this.fallbackSaveToStorage(payload);
                }
            }
        } catch (e) {
            await this.fallbackSaveToStorage(payload);
        }

        // Обновить UI, если открыта статистика
        this.eventBus.emit('stats:updated');
    }

    /**
     * Fallback: сохранение в localStorage
     */
    async fallbackSaveToStorage(entry) {
        try {
            const local = (await this.storage.load('snakeLeaderboard')) || [];
            const filtered = local.filter(p => p.userId !== entry.userId);
            filtered.push(entry);

            const saved = filtered
                .sort((a, b) => b.score - a.score)
                .slice(0, 100);

            await this.storage.save('snakeLeaderboard', saved);
            this._leaderboard = saved;
            this._leaderboardTimestamp = Date.now();

            this.eventBus.emit('snackbar:show', {
                message: 'Saved offline',
                type: 'info'
            });
        } catch (e) {
            console.error('StatsService: fallback save failed', e);
        }
    }

    // === 🏆 Лидерборд ===

    /**
     * Загружает топ-100 игроков
     * @returns {Promise<Array>}
     */
    async loadLeaderboard() {
        const now = Date.now();

        if (this._leaderboard && now - this._leaderboardTimestamp < this.LEADERBOARD_CACHE_TTL) {
            this._leaderboard._source = 'cache';
            return this._leaderboard;
        }

        let leaderboard = [];

        try {
            const res = await fetch(`${this.API_URL}/api/leaderboard`, {
                method: 'GET',
                cache: 'no-cache'
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    leaderboard = data;
                }
            }
        } catch (e) {
            console.warn('StatsService: API leaderboard failed', e);
        }

        // Fallback: из localStorage
        if (leaderboard.length === 0) {
            const fallback = await this.storage.load('snakeLeaderboard');
            if (Array.isArray(fallback)) {
                leaderboard = fallback;
            }
        }

        // Сортировка и обрезка
        const sorted = leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);

        this._leaderboard = sorted;
        this._leaderboardTimestamp = now;
        sorted._source = leaderboard.length > 0 ? 'api' : 'fallback';

        return sorted;
    }

    // === 💾 Локальное сохранение статистики ===

    /**
     * Сохраняет личную статистику локально (localStorage + CloudStorage)
     * @param {Object} data - { score, level }
     */
    async savePersonalStatsLocally({ score, level }) {
        const stats = {
            highScore: Math.max(this.user.highScore, score),
            totalGames: this.user.totalGames,
            totalScore: this.user.totalScore,
            level,
            lastUpdated: Date.now()
        };

        try {
            await this.storage.save(`user_stats_${this.user.id}`, stats);
            this._personalStats = stats;
            this._personalStatsTimestamp = Date.now();
        } catch (e) {
            console.warn('StatsService: не удалось сохранить личную статистику', e);
        }
    }

    // === 🧹 Кэш ===

    /**
     * Очистка кэша
     * @param {'all'|'leaderboard'|'personal'} target
     */
    clearCache(target = 'all') {
        if (target === 'all' || target === 'leaderboard') {
            this._leaderboard = null;
            this._leaderboardTimestamp = 0;
        }
        if (target === 'all' || target === 'personal') {
            this._personalStats = null;
            this._personalStatsTimestamp = 0;
        }
    }

    // === 🔄 Авто-синхронизация ===

    /**
     * Синхронизация с сервером
     */
    async autoSync() {
        if (!this.user.isRegistered) return;

        try {
            // Загружаем локальные данные
            const localLeaderboard = await this.storage.load('snakeLeaderboard');
            const userEntry = localLeaderboard?.find(p => p.userId === this.user.id);

            if (userEntry && userEntry.score > (this.user.highScore || 0)) {
                await this.saveScoreToLeaderboard(userEntry.score, userEntry.level);
            }

            this.eventBus.emit('snackbar:show', {
                message: '✅ Synced with server',
                type: 'success'
            });
        } catch (e) {
            console.warn('StatsService: auto-sync failed', e);
            this.eventBus.emit('snackbar:show', {
                message: 'No internet',
                type: 'error'
            });
        }
    }
}