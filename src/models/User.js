// src/models/User.js

/**
 * Модель пользователя — Telegram-пользователь или Guest
 * Полностью автономна, работает без Telegram
 */
export default class User {
    constructor(tgUser = null) {
        if (tgUser) {
            this.id = String(tgUser.id);
            this.firstName = tgUser.first_name || '';
            this.lastName = tgUser.last_name || '';
            this.username = tgUser.username || '';
            this.languageCode = tgUser.language_code || 'en';
            this.isBot = !!tgUser.is_bot;
            this.photoUrl = tgUser.photo_url || null;
            this.isGuest = false;
        } else {
            // Гость: уникальный ID, но не привязан к Telegram
            this.id = this.generateGuestId();
            this.firstName = 'Guest';
            this.lastName = '';
            this.username = '';
            this.languageCode = 'en';
            this.isBot = false;
            this.photoUrl = null;
            this.isGuest = true;
        }

        // Статистика
        this.highScore = 0;
        this.totalGames = 0;
        this.totalScore = 0;
        this.level = 1;

        // Временные метки
        this.createdAt = new Date().toISOString();
        this.lastPlayed = this.createdAt;

        // Флаги
        this.isDeleted = false;
    }

    generateGuestId() {
        return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // --- Геттеры ---
    get fullName() {
        return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.username || 'Anonymous';
    }

    get isRegistered() {
        return !this.isGuest;
    }

    // --- Обновление статистики ---
    updateStats(score, level) {
        this.totalGames++;
        this.totalScore += score;

        if (score > this.highScore) {
            this.highScore = score;
        }

        this.level = level;
        this.lastPlayed = new Date().toISOString();
    }

    // --- Восстановление из сохранённых данных ---
    applyStats(stats = {}) {
        if (this.isDeleted) return;

        this.highScore = Math.max(0, Number(stats.highScore) || 0);
        this.totalGames = Math.max(0, Number(stats.totalGames) || 0);
        this.totalScore = Math.max(0, Number(stats.totalScore) || 0);
        this.level = Math.max(1, Number(stats.level) || 1);

        if (stats.lastPlayed) {
            this.lastPlayed = new Date(stats.lastPlayed).toISOString();
        }

        if (stats.createdAt) {
            this.createdAt = new Date(stats.createdAt).toISOString();
        }
    }

    // --- Преобразование ---
    toPublicData() {
        return {
            userId: this.id,
            name: this.fullName,
            username: this.username,
            photoUrl: this.photoUrl,
            isGuest: this.isGuest,
            isDeleted: this.isDeleted
        };
    }

    toStats() {
        return {
            highScore: this.highScore,
            totalGames: this.totalGames,
            totalScore: this.totalScore,
            level: this.level,
            lastPlayed: this.lastPlayed,
            createdAt: this.createdAt
        };
    }

    toJSON() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            languageCode: this.languageCode,
            photoUrl: this.photoUrl,
            isGuest: this.isGuest,
            isDeleted: this.isDeleted,
            highScore: this.highScore,
            totalGames: this.totalGames,
            totalScore: this.totalScore,
            level: this.level,
            lastPlayed: this.lastPlayed,
            createdAt: this.createdAt
        };
    }

    /**
     * Создаёт User из сохранённых данных
     * @param {Object|null} saved - Данные из localStorage / CloudStorage
     * @param {Object|null} currentTgUser - Актуальные данные из Telegram (может быть null)
     * @returns {User}
     */
    static fromSaved(saved, currentTgUser) {
        // Если нет сохранённых данных — создаём нового (гость или Telegram)
        if (!saved) {
            return new User(currentTgUser);
        }

        // Если пользователь вошёл в Telegram, но ранее был гостем
        if (currentTgUser && saved.isGuest) {
            const user = new User(currentTgUser);
            user.updateStats(saved.highScore, saved.level); // Переносим прогресс
            return user;
        }

        // Если пользователь изменил Telegram-аккаунт
        if (currentTgUser && saved.id !== String(currentTgUser.id)) {
            const user = new User(currentTgUser);
            return user; // Новый пользователь
        }

        // Восстанавливаем существующего
        const user = new User(currentTgUser || null); // null = гость
        user.applyStats(saved);
        user.createdAt = saved.createdAt || user.createdAt;
        user.isDeleted = !!saved.isDeleted;

        return user;
    }
}
