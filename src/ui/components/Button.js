// src/ui/components/Button.js

/**
 * Хакерская кнопка в стиле неонового терминала
 * - Свечение, глитч, анимации
 * - Полностью стилизуется через CSS
 * - Нет иконок, только текст
 */
export default class Button {
    /**
     * @param {Object} config
     * @param {string} config.text - Текст кнопки (автоматически в uppercase)
     * @param {Function} config.onClick - Обработчик клика
     * @param {HTMLElement} [config.container] - Где вставить кнопку
     */
    constructor({ text = 'Button', onClick = () => { }, container = null }) {
        this.text = text;
        this.onClick = onClick;
        this.container = container;

        this.element = this.createElement();

        if (container) {
            container.appendChild(this.element);
        }
    }

    createElement() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hacker-btn';
        button.textContent = this.text.toUpperCase();

        button.addEventListener('click', (e) => {
            if (button.disabled) {
                e.preventDefault();
                return;
            }
            this.onClick(e, this);
        });

        return button;
    }

    /**
     * Обновить текст кнопки
     */
    setText(text) {
        this.text = text;
        this.element.textContent = text.toUpperCase();
    }

    /**
     * Включить/выключить состояние загрузки
     */
    setLoading(loading = true) {
        if (loading) {
            this.element.disabled = true;
            this.element.classList.add('loading');
        } else {
            this.element.disabled = false;
            this.element.classList.remove('loading');
        }
    }

    /**
     * Включить/выключить блокировку
     */
    setDisabled(disabled = true) {
        this.element.disabled = disabled;
    }

    /**
     * Добавить в контейнер
     */
    appendTo(container) {
        if (this.container && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.container = container;
        container.appendChild(this.element);
    }

    /**
     * Удалить из DOM
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Получить элемент
     */
    getElement() {
        return this.element;
    }
}
