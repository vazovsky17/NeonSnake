// src/ui/components/SettingsModal.js
import Modal from './Modal.js';

export default class SettingsModal extends Modal {
    constructor(app) {
        super('settingsModal', app.eventBus);
        this.app = app;
        this.settings = app.settings;

        // Если модалка ещё не в DOM — создаём её с тем же оформлением, что и GameOverScreen
        if (!this.element) {
            this.createElement();
            // Rebind Modal events to new element
            this.bindEvents();
        }

        this.render();
        this.bindInputs();
    }

    createElement() {
        const el = document.createElement('div');
        el.id = 'settingsModal';
        el.className = 'modal';
        el.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title">SETTINGS</h2>

                <div class="modal-stats">
                    <div class="stat-line">
                        <label class="label">Sound</label>
                        <input type="checkbox" id="soundToggle" />
                    </div>
                    <div class="stat-line">
                        <label class="label">Vibration</label>
                        <input type="checkbox" id="vibrationToggle" />
                    </div>
                    <div class="stat-line">
                        <label class="label">Show arrows</label>
                        <input type="checkbox" id="showArrowsCheckbox" />
                    </div>
                    <div class="stat-line">
                        <label class="label">Volume</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input id="volumeRange" type="range" min="0" max="100" value="50" />
                            <div id="volumeValue" class="value">50%</div>
                        </div>
                    </div>
                </div>

                <div class="btn-group">
                    <button id="settingsClose" class="hacker-btn">CLOSE</button>
                </div>

                <div class="modal-footer">
                    <div class="version">v1.0</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.element = el;
    }

    render() {
        const soundEl = document.getElementById('soundToggle');
        if (soundEl) soundEl.checked = this.settings.sound;

        const vibEl = document.getElementById('vibrationToggle');
        if (vibEl) vibEl.checked = this.settings.vibration;

        const showArrowsEl = document.getElementById('showArrowsCheckbox');
        if (showArrowsEl) showArrowsEl.checked = this.settings.showArrows;

        const volumeRangeEl = document.getElementById('volumeRange');
        const volumeValueEl = document.getElementById('volumeValue');
        if (volumeRangeEl) volumeRangeEl.value = this.settings.volume;
        if (volumeValueEl) volumeValueEl.textContent = `${this.settings.volume}%`;
    }

    bindInputs() {
        const { eventBus } = this.app;

        const soundEl = document.getElementById('soundToggle');
        if (soundEl) soundEl.onchange = (e) => {
            eventBus.emit('settings:change', { sound: e.target.checked });
        };

        const volumeEl = document.getElementById('volumeRange');
        const volumeValueEl = document.getElementById('volumeValue');
        if (volumeEl) volumeEl.onchange = (e) => {
            const value = Number(e.target.value);
            if (volumeValueEl) volumeValueEl.textContent = `${value}%`;
            eventBus.emit('settings:change', { volume: value });
            this.app.soundService.setVolume(value / 100);
        };

        const showArrowsEl = document.getElementById('showArrowsCheckbox');
        if (showArrowsEl) showArrowsEl.onchange = (e) => {
            const show = e.target.checked;
            // Делегируем применение настроек в App через EventBus
            eventBus.emit('settings:change', { showArrows: show });
        };

        // Закрытие модалки
        const closeBtn = document.getElementById('settingsClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    }
}