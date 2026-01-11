// src/core/App.js

import EventBus from './EventBus.js';
import StorageService from '../services/StorageService.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import SoundService from '../services/SoundService.js';
import ThemeService from '../services/ThemeService.js';

// Импорт экранов
import StartScreen from '../ui/screens/StartScreen.js';
import GameScreen from '../ui/screens/GameScreen.js';
import PauseScreen from '../ui/screens/PauseScreen.js';
import GameOverScreen from '../ui/screens/GameOverScreen.js';
import LoadingScreen from '../ui/screens/LoadingScreen.js'; 
import SettingsScreen from '../ui/screens/SettingsScreen.js'

/**
 * Главный класс приложения
 * Координирует все компоненты: сервисы, модели, экраны
 */
export default class App {
    constructor() {
        // === Сервисы ===
        this.eventBus = new EventBus();
        this.storage = new StorageService();
        this.settings = new Settings();
        this.soundService = new SoundService(this.settings);
        this.themeService = new ThemeService(this.eventBus);

        // === Модели ===
        this.user = null;

        // === Экраны ===
        this.loadingScreen = null;
        this.startScreen = null;
        this.gameScreen = null;
        this.pauseScreen = null;
        this.gameOverScreen = null;
        this.settingsScreen = null;

        // Счётчик открытых UI-слоёв (модалки, полноэкранные настройки и т.д.)
        this._uiModalCount = 0;

        // Инициализация
        this.init();
    }

    async init() {
        console.log('🚀 App initializing...');

        try {
            // Создаём загрузчик
            this.loadingScreen = new LoadingScreen(this);
            this.eventBus.emit('app:start'); // → запускает LoadingScreen.show()

            // Ждём, пока загрузка начнётся
            await this.sleep(100);

            // === 1. INITIALIZING SYSTEM ===
            this.eventBus.emit('loading:step', 'init');
            await this.sleep(800); // визуальная задержка

            // === 2. AUTHORIZING USER ===
            this.eventBus.emit('loading:step', 'auth');
            await this.loadUser();
            await this.sleep(200); // небольшая пауза

            // === 3. LOADING MEMORY CORE ===
            this.eventBus.emit('loading:step', 'memory');
            await this.loadSettings();
            await this.sleep(200);

            // === 4. STARTING RENDER ENGINE ===
            this.eventBus.emit('loading:step', 'render');
            this.createScreens();
            await this.sleep(200);

            // === 5. INITIALIZING AUDIO ===
            this.eventBus.emit('loading:step', 'sound');
            // SoundService уже создан в конструкторе, но можно проинициализировать его явно
            // Запускаем этап, но не ждём активации звука
            console.log('🔊 Audio will activate on first user interaction');

            await this.sleep(200);

            // === 6. BOOT COMPLETE ===
            this.eventBus.emit('loading:step', 'done');

            // Финал
            this.applySettings();
            this.bindEvents();

            console.log('✅ App fully ready');
            this.eventBus.emit('app:ready');

        } catch (err) {
            console.error('🔥 Critical error:', err);
            this.eventBus.emit('app:ready');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadUser() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
        const savedUserData = await this.storage.load('userState');

        this.user = User.fromSaved(savedUserData, tgUser);

        if (tgUser && this.user.id !== String(tgUser.id)) {
            this.user = new User(tgUser);
            await this.storage.save('userState', this.user.toJSON());
        }

        this.eventBus.emit('user:loaded', this.user);
    }

    async loadSettings() {
        const saved = await this.storage.load('appSettings');
        this.settings.apply(saved);
    }

    createScreens() {
        // Все экраны получают `this` (экземпляр App)
        this.startScreen = new StartScreen(this);
        this.gameScreen = new GameScreen(this);
        this.pauseScreen = new PauseScreen(this);
        this.gameOverScreen = new GameOverScreen(this);
        this.settingsScreen = new SettingsScreen(this);
    }

    applySettings() {
        this.themeService.apply(this.settings.theme);
        this.soundService.setVolume(this.settings.volume / 100);

        // Ищем контейнер кнопок управления (более надёжный селектор)
        const controls = document.querySelector('#game-control-buttons, .controls');
        console.debug('App.applySettings: showArrows=', this.settings.showArrows, 'controls=', controls);
        if (controls) {
            // Используем 'flex' — соответствует первоначальной раскладке кнопок
            controls.style.display = this.settings.showArrows ? 'flex' : 'none';
        }
    }

    bindEvents() {
        // === Настройки ===
        this.eventBus.on('settings:change', async (updates) => {
            this.settings.update(updates);
            this.applySettings();
            await this.storage.save('appSettings', this.settings.toJSON());
            this.eventBus.emit('settings:updated', this.settings);
        });

        // === Обновление пользователя ===
        this.eventBus.on('user:update', async (user) => {
            Object.assign(this.user, user);
            this.user.lastPlayed = new Date().toISOString();
            await this.storage.save('userState', this.user.toJSON());
        });

        // === Игра окончена — обновить статистику ===
        this.eventBus.on('game:gameover', async (data) => {
            this.user.updateStats(data.score, data.level);
            this.eventBus.emit('user:update', this.user);
        });

        // === Telegram и видимость ===
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.onEvent?.('focus', () => this.eventBus.emit('app:focus'));
            tg.onEvent?.('visibility_changed', (e) => {
                if (e.is_visible) this.eventBus.emit('app:visible');
            });
        }

        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.eventBus.emit('app:visible');
            }
        });
        // Track global pause state
        this._isGamePaused = false;
        this.eventBus.on('game:pause', () => { this._isGamePaused = true; });
        this.eventBus.on('game:resume', () => { this._isGamePaused = false; });

        // Управление состоянием паузы при открытии/закрытии модалок/полноэкранных UI
        this.eventBus.on('ui:modal:open', () => {
            this._uiModalCount = (this._uiModalCount || 0) + 1;
            console.debug('App: modal opened, count=', this._uiModalCount);
            if (this._uiModalCount === 1) {
                // Запомним, был ли игровой экран в паузе до открытия модалки
                this._wasGamePausedBeforeModal = !!this._isGamePaused;

                // Спрячем оверлей паузы, чтобы модалка была видна
                this.eventBus.emit('pause:hideOverlay');

                // Если игра не была на паузе — поставим её на тихую паузу (без оверлея)
                if (!this._wasGamePausedBeforeModal) {
                    this.eventBus.emit('game:pause', { silent: true });
                }
            }
        });

        this.eventBus.on('ui:modal:close', () => {
            this._uiModalCount = Math.max(0, (this._uiModalCount || 0) - 1);
            console.debug('App: modal closed, count=', this._uiModalCount);
            if (this._uiModalCount === 0) {
                // Если перед открытием модалки игра была на паузе — восстановим оверлей паузы
                if (this._wasGamePausedBeforeModal) {
                    this.eventBus.emit('game:pause'); // non-silent → покажет PauseScreen
                } else {
                    this.eventBus.emit('game:resume');
                }
                this._wasGamePausedBeforeModal = false;
            }
        });    }
}
