// src/ui/components/Modal.js
export default class Modal {
    constructor(id, eventBus = null) {
        this.element = document.getElementById(id);
        this.eventBus = eventBus;
        this.bindEvents();
    }

    show() {
        this.element.classList.add('show');
        // Сообщаем приложению, что открыт UI-слой (модалка)
        if (this.eventBus) {
            this.eventBus.emit('ui:modal:open');
        }
    }

    hide() {
        this.element.classList.remove('show');
        // Сообщаем приложению, что UI-слой закрыт
        if (this.eventBus) {
            this.eventBus.emit('ui:modal:close');
        }
    }

    bindEvents() {
        this.element?.addEventListener('click', (e) => {
            if (e.target.id === this.element.id) {
                this.hide();
            }
        });
    }
}