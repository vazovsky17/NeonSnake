// src/ui/screens/SettingsScreen.js

/**
 * Экран настроек
 * Позволяет менять:
 * - Тему
 * - Звук
 * - Вибрацию
 * - Показ стрелок
 * - Громкость
 */
export default class SettingsScreen {
    /**
     * @param {App} app
     */
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.settings = app.settings;
        this.screenElement = null;

        this.init();
    }

    init() {
        this.create();
        this.bindEvents();
        this.updateForm();
    }

    create() {
        // Основной контейнер
        this.screenElement = document.createElement('div');
        this.screenElement.className = 'screen settings-screen';
        this.screenElement.innerHTML = `
            <div class="settings-container" style="
                width: 90%;
                max-width: 400px;
                background: var(--overlay-bg);
                border: 1px solid var(--card-border);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 0 30px var(--accent-glow);
                font-family: 'Orbitron', monospace;
                color: var(--neon-cyan);
                backdrop-filter: blur(10px);
                position: relative;
            ">
                <h2 style="
                    text-align: center;
                    margin: 0 0 24px;
                    color: var(--neon-green);
                    text-shadow: 0 0 5px var(--neon-green);
                ">Настройки</h2>

                <!-- Тема -->
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="
                        display: block;
                        margin-bottom: 8px;
                        color: var(--neon-pink);
                        font-weight: bold;
                    ">Тема</label>
                    <select name="theme" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid var(--neon-cyan);
                        border-radius: 8px;
                        background: var(--card-bg);
                        color: var(--neon-cyan);
                        font-family: inherit;
                        outline: none;
                        box-shadow: 0 0 5px var(--accent-glow);
                    ">
                        <option value="neon">Neon</option>
                        <option value="cyberpunk">Cyberpunk</option>
                        <option value="matrix">Matrix</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>

                <!-- Звук -->
                <label style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    font-size: 14px;
                ">
                    <input type="checkbox" name="sound" style="
                        accent-color: var(--neon-green);
                    "> Звук включён
                </label>

                <!-- Вибрация -->
                <label style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    font-size: 14px;
                ">
                    <input type="checkbox" name="vibration" style="
                        accent-color: var(--neon-purple);
                    "> Вибрация
                </label>

                <!-- Показ стрелок -->
                <label style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    font-size: 14px;
                ">
                    <input type="checkbox" name="showArrows" style="
                        accent-color: var(--neon-pink);
                    "> Показ стрелок
                </label>

                <!-- Громкость -->
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="
                        display: block;
                        margin-bottom: 8px;
                        color: var(--neon-blue);
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        Громкость: <span name="volumeLabel">80</span>%
                    </label>
                    <input type="range" name="volume" min="0" max="100" value="80" style="
                        width: 100%;
                        accent-color: var(--neon-blue);
                    ">
                </div>

                <!-- Кнопка закрытия -->
                <button type="button" name="close" style="
                    width: 100%;
                    padding: 12px;
                    background: var(--accent-glow);
                    border: 1px solid var(--neon-cyan);
                    border-radius: 8px;
                    color: var(--neon-cyan);
                    font-family: inherit;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-shadow: 0 0 5px var(--neon-cyan);
                ">Закрыть</button>
            </div>
        `;

        // Добавляем в DOM
        document.getElementById('app')?.appendChild(this.screenElement);
    }

    bindEvents() {
        const form = this.screenElement;
        const inputs = form.querySelectorAll('input, select');

        // Обновление при изменении
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveSettings();
            });
        });

        // Обновление метки громкости
        const volumeInput = form.querySelector('input[name="volume"]');
        const volumeLabel = form.querySelector('[name="volumeLabel"]');
        volumeInput.addEventListener('input', () => {
            volumeLabel.textContent = volumeInput.value;
        });

        // Закрытие экрана
        form.querySelector('[name="close"]').addEventListener('click', () => {
            this.hide();
        });

        // EventBus — показать экран
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

        // Делегируем обновление приложению через EventBus — App обработает применение и сохранение
        this.eventBus.emit('settings:change', { ...newSettings });

        console.log('⚙️ Отправлен запрос на изменение настроек:', newSettings);
    }

    show() {
        this.updateForm();
        this.screenElement.classList.add('show');
        // Трактуем полноэкранный экран настроек как UI-слой, который должен ставить игру на паузу
        this.eventBus.emit('ui:modal:open');
        this.eventBus.emit('screen:shown', { screen: 'settings' });
    }

    hide() {
        this.screenElement.classList.remove('show');
        this.eventBus.emit('ui:modal:close');
        this.eventBus.emit('screen:hidden', { screen: 'settings' });
    }
}
