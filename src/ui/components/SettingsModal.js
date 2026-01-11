// src/ui/components/SettingsModal.js
import Modal from './Modal.js';

export default class SettingsModal extends Modal {
    constructor(app) {
        super('settingsModal', app.eventBus);
        this.app = app;
        this.settings = app.settings;
        this.render();
        this.bindInputs();
    }

    render() {
        document.getElementById('soundToggle').checked = this.settings.sound;
        document.getElementById('vibrationToggle').checked = this.settings.vibration;
        document.getElementById('showArrowsCheckbox').checked = this.settings.showArrows;
        document.getElementById('volumeRange').value = this.settings.volume;
        document.getElementById('volumeValue').textContent = `${this.settings.volume}%`;
    }

    bindInputs() {
        const { eventBus } = this.app;

        document.getElementById('soundToggle').onchange = (e) => {
            eventBus.emit('settings:change', { sound: e.target.checked });
        };

        document.getElementById('volumeRange').onchange = (e) => {
            const value = Number(e.target.value);
            document.getElementById('volumeValue').textContent = `${value}%`;
            eventBus.emit('settings:change', { volume: value });
            this.app.soundService.setVolume(value / 100);
        };

        document.getElementById('showArrowsCheckbox').onchange = (e) => {
            const show = e.target.checked;
            document.querySelector('.controls').style.display = show ? 'grid' : 'none';
            eventBus.emit('settings:change', { showArrows: show });
        };
    }
}