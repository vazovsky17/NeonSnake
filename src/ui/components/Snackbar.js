// src/ui/components/Snackbar.js

/**
 * Компонент всплывающих уведомлений (snackbar)
 * Работает через EventBus: 'snackbar:show'
 * Поддерживает типы: success, error, info, warning
 */
export default class Snackbar {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // Создаём элемент, если его нет
        this.element = document.getElementById('snackbar');
        if (!this.element) {
            this.element = this.createSnackbarElement();
            document.body.appendChild(this.element);
        }

        this.types = ['info', 'success', 'error', 'warning'];

        // Подписываемся на события
        this.bindEvents();
    }

    /**
     * Создаёт DOM-элемент snackbar
     * @returns {HTMLElement}
     */
    createSnackbarElement() {
        const el = document.createElement('div');
        el.id = 'snackbar';
        el.className = 'snackbar';
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'polite');
        return el;
    }

    /**
     * Подписка на события
     */
    bindEvents() {
        this.eventBus.on('snackbar:show', (data) => {
            const message = typeof data === 'string' ? data : data.message;
            const type = typeof data === 'object' && data.type ? data.type : 'info';
            this.show(message, type);
        });
    }

    /**
     * Показывает сообщение
     * @param {string} message
     * @param {string} type - info | success | error | warning
     */
    show(message, type = 'info') {
        // Валидация типа
        if (!this.types.includes(type)) {
            console.warn(`Snackbar: неизвестный тип "${type}". Используем "info".`);
            type = 'info';
        }

        // Очищаем предыдущие классы
        this.element.className = 'snackbar';

        // Устанавливаем текст и тип
        this.element.textContent = message;
        this.element.classList.add(type);

        // Анимация: показ
        requestAnimationFrame(() => {
            this.element.classList.add('show');
        });

        // Автоматическое скрытие
        clearTimeout(this._hideTimeout);
        this._hideTimeout = setTimeout(() => {
            this.hide();
        }, 3000);
    }

    /**
     * Скрывает snackbar
     */
    hide() {
        this.element.classList.remove('show');
        setTimeout(() => {
            this.element.textContent = '';
        }, 300);
    }

    /**
     * Синхронное закрытие
     */
    close() {
        this.hide();
    }
}