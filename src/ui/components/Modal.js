// src/ui/components/Modal.js
export default class Modal {
    constructor(id, eventBus = null) {
        this.element = document.getElementById(id);
        this.eventBus = eventBus;
        this.bindEvents();
    }

    show() {
        this.element.classList.add('show');
    }

    hide() {
        this.element.classList.remove('show');
    }

    bindEvents() {
        this.element?.addEventListener('click', (e) => {
            if (e.target.id === this.element.id) {
                this.hide();
            }
        });
    }
}