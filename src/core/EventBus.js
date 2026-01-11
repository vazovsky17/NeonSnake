// src/core/EventBus.js

/**
 * Простой и надёжный EventBus (Pub/Sub)
 * Поддерживает:
 * - Подписку на события
 * - Отписку
 * - Отправку данных
 * - Одноразовые события (once)
 */
export default class EventBus {
    constructor() {
        // { eventName: [ { fn, ctx, once } ] }
        this.events = new Map();
    }

    /**
     * Подписаться на событие
     * @param {string} event
     * @param {Function} callback
     * @param {Object|null} context - Контекст (this)
     * @returns {Function} Функция отписки
     */
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const handler = { fn: callback, ctx: context, once: false };
        this.events.get(event).push(handler);

        // Возвращаем функцию отписки
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Подписаться на событие один раз
     * @param {string} event
     * @param {Function} callback
     * @param {Object|null} context
     */
    once(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const handler = { fn: callback, ctx: context, once: true };
        this.events.set(event, this.events.has(event) ? [...this.events.get(event), handler] : [handler]);
    }

    /**
     * Отписаться от события
     * @param {string} event
     * @param {Function|null} callback - Если null — отписываем все
     */
    off(event, callback = null) {
        if (!this.events.has(event)) return;

        if (callback === null) {
            this.events.delete(event);
            return;
        }

        const handlers = this.events.get(event);
        const index = handlers.findIndex(h => h.fn === callback);
        if (index !== -1) {
            handlers.splice(index, 1);
        }

        if (handlers.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Отправить событие
     * @param {string} event
     * @param {any} data - Любые данные
     */
    emit(event, data = null) {
        if (!this.events.has(event)) return false;

        // Работаем с копией, чтобы можно было подписываться/отписываться во время emit
        const handlers = [...this.events.get(event)];

        for (const handler of handlers) {
            try {
                const context = handler.ctx || null;
                handler.fn.call(context, data);

                // Удаляем одноразовые обработчики
                if (handler.once) {
                    this.off(event, handler.fn);
                }
            } catch (e) {
                console.error(`EventBus: error in handler for "${event}"`, e);
            }
        }

        return true;
    }

    /**
     * Проверить, есть ли подписчики
     * @param {string} event
     * @returns {boolean}
     */
    has(event) {
        return this.events.has(event) && this.events.get(event).length > 0;
    }

    /**
     * Удалить все события
     */
    clear() {
        this.events.clear();
    }
}