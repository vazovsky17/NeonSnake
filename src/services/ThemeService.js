// src/services/ThemeService.js

/**
 * Сервис управления темами
 * Отвечает за:
 * - Применение темы
 * - Сохранение выбора
 * - Поддержку нескольких тем
 * - Haptic Feedback (если включено)
 */
export default class ThemeService {
    /**
     * Доступные темы
     * Можно расширить: 'retro', 'matrix', 'dark'
     */
    static THEMES = ['neon', 'cyberpunk', 'dark', 'matrix'];

    /**
     * @param {EventBus} eventBus - Глобальный EventBus
     */
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.currentTheme = 'neon';
        this.storageKey = 'appTheme';

        // Подключаемся к событиям
        this.bindEvents();
    }

    /**
     * Применяет тему
     * @param {string} theme - Имя темы
     * @returns {boolean} Успешно ли применено
     */
    apply(theme) {
        if (!ThemeService.THEMES.includes(theme)) {
            console.warn(`ThemeService: неизвестная тема "${theme}". Доступные:`, ThemeService.THEMES);
            return false;
        }

        if (this.currentTheme === theme) {
            return true;
        }

        // Меняем атрибут
        document.documentElement.setAttribute('data-theme', theme);

        // Сохраняем
        try {
            localStorage.setItem(this.storageKey, theme);
        } catch (e) {
            console.warn('ThemeService: не удалось сохранить в localStorage', e);
        }

        // Обновляем состояние
        const oldTheme = this.currentTheme;
        this.currentTheme = theme;

        // Сигнал другим компонентам
        this.eventBus.emit('theme:changed', { old: oldTheme, new: theme });

        // Haptic feedback (если включено)
        this.triggerHaptic();

        console.log(`🎨 Тема изменена: ${oldTheme} → ${theme}`);
        return true;
    }

    /**
     * Загружает сохранённую тему
     */
    loadSavedTheme() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved && ThemeService.THEMES.includes(saved)) {
            this.apply(saved);
        } else {
            this.apply('neon');
        }
    }

    /**
     * Возвращает текущую тему
     * @returns {string}
     */
    getCurrent() {
        return this.currentTheme;
    }

    /**
     * Переключает на следующую тему (в цикле)
     */
    cycleTheme() {
        const index = ThemeService.THEMES.indexOf(this.currentTheme);
        const nextIndex = (index + 1) % ThemeService.THEMES.length;
        this.apply(ThemeService.THEMES[nextIndex]);
    }

    /**
     * Подписывается на события
     */
    bindEvents() {
        // Пример: если приложение разрешает темы по условию
        this.eventBus.on('settings:updated', (settings) => {
            // Можно добавить логику в будущем
            // Например, блокировка тем для гостя
        });

        // Или: смена темы по команде
        this.eventBus.on('theme:cycle', () => {
            this.cycleTheme();
        });

        this.eventBus.on('theme:apply', (theme) => {
            this.apply(theme);
        });
    }

    /**
     * Вызывает тактильную обратную связь (если разрешена)
     */
    triggerHaptic() {
        // Получаем текущие настройки из App (если доступно)
        const app = window.app;
        const settings = app?.settings;

        if (settings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            } catch (e) {
                console.warn('Haptic feedback failed', e);
            }
        }
    }

    /**
     * Возвращает список доступных тем
     * @returns {string[]}
     */
    getAvailableThemes() {
        return [...ThemeService.THEMES];
    }
}