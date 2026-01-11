// src/ui/screens/SettingsScreen.js

export default class SettingsScreen {
    /**
     * @param {App} app
     */
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.settings = app.settings;
        this.screenElement = null;
        this._saveTimeout = null; // таймер для дебаунса сохранения (ползунок громкости) 

        this.init();
    }

    init() {
        this.create();
        this.bindEvents();
        this.updateForm();
    }

    create() {
        if (document.getElementById('settingsScreen')) {
            this.screenElement = document.getElementById('settingsScreen');
            return;
        }

        this.screenElement = document.createElement('div');
        this.screenElement.id = 'settingsScreen';
        this.screenElement.className = 'screen';
        this.screenElement.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title">SETTINGS</h2>

                <div class="settings-form">
                    <div class="form-group">
                        <label>Theme</label>
                        <select name="theme" class="settings-select">
                            <option value="neon">Neon</option>
                            <option value="cyberpunk">Cyberpunk</option>
                            <option value="matrix">Matrix</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>

                    <label class="setting-row">
                        <input type="checkbox" name="sound">
                        <span>Sound Enabled</span>
                    </label>

                    <label class="setting-row">
                        <input type="checkbox" name="vibration">
                        <span>Vibration</span>
                    </label>

                    <label class="setting-row">
                        <input type="checkbox" name="showArrows">
                        <span>Show Arrows</span>
                    </label>

                    <div class="form-group">
                        <label>Volume: <span name="volumeLabel">80</span>%</label>
                        <input type="range" name="volume" min="0" max="100" value="80" class="settings-slider">
                    </div>
                </div>

                <div class="btn-group">
                    <button type="button" name="close" class="hacker-btn">CLOSE</button>
                </div>

                <div class="modal-hint">
                    <small>ESC: Close</small>
                </div>
            </div>
        `;

        document.body.appendChild(this.screenElement);
    }

    bindEvents() {
        const form = this.screenElement;
        const inputs = form.querySelectorAll('input, select');

        // Обновляем метку громкости и сохраняем настройки при движении с небольшой задержкой
        const volumeInput = form.querySelector('input[name="volume"]');
        const volumeLabel = form.querySelector('[name="volumeLabel"]');
        if (volumeInput && volumeLabel) {
            volumeInput.addEventListener('input', () => {
                volumeLabel.textContent = volumeInput.value;
                if (this._saveTimeout) clearTimeout(this._saveTimeout);
                this._saveTimeout = setTimeout(() => {
                    this.saveSettings();
                    this._saveTimeout = null;
                }, 180);
            });
        }

        // События изменений
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveSettings();
            });
        });

        // Кнопки
        const saveBtn = form.querySelector('[name="save"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        const closeBtn = form.querySelector('[name="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible()) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        });

        // Показ экрана
        this.eventBus.on('screen:show', (data) => {
            if (data.screen === 'settings') {
                this.show();
            }
        });
    }

    updateForm() {
        const { theme, sound, vibration, showArrows, volume } = this.settings;

        this.screenElement.querySelector('select[name="theme"]').value = theme;
        this.screenElement.querySelector('input[name="sound"]').checked = sound;
        this.screenElement.querySelector('input[name="vibration"]').checked = vibration;
        this.screenElement.querySelector('input[name="showArrows"]').checked = showArrows;
        this.screenElement.querySelector('input[name="volume"]').value = volume;
        this.screenElement.querySelector('[name="volumeLabel"]').textContent = volume;
    }

    saveSettings() {
        const form = this.screenElement;
        const newSettings = {
            theme: form.querySelector('select[name="theme"]').value,
            sound: form.querySelector('input[name="sound"]').checked,
            vibration: form.querySelector('input[name="vibration"]').checked,
            showArrows: form.querySelector('input[name="showArrows"]').checked,
            volume: Number(form.querySelector('input[name="volume"]').value)
        };

        this.eventBus.emit('settings:change', { ...newSettings });

        // Применяем настройки сразу при изменении — уведомления не показываем (избегаем спама)
        console.log('⚙️ Settings updated:', newSettings);
    }

    show() {
        this.updateForm();
        this.screenElement.classList.add('show');
        this.screenElement.style.display = 'flex';
        this.eventBus.emit('ui:modal:open');
        this.eventBus.emit('screen:shown', { screen: 'settings' });
    }

    hide() {
        this.screenElement.classList.remove('show');
        setTimeout(() => {
            this.screenElement.style.display = 'none';
        }, 300);
        this.eventBus.emit('ui:modal:close');
        this.eventBus.emit('screen:hidden', { screen: 'settings' });
    }

    isVisible() {
        return this.screenElement.classList.contains('show');
    }
}
