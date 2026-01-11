// src/models/Settings.js

const AVAILABLE_THEMES = ['cyberpunk', 'matrix', 'neon', 'dark'];

export default class Settings {
    constructor() {
        this.sound = true;
        this.vibration = true;
        this.theme = 'cyberpunk';
        this.showArrows = true;
        this.volume = 80; // 0–100
    }

    apply(saved = {}) {
        // 👇 Защита от null, undefined, не-объектов
        if (!saved || typeof saved !== 'object') {
            saved = {};
        }

        this.sound = saved.sound ?? true;
        this.vibration = saved.vibration ?? true;
        this.showArrows = saved.showArrows ?? true;
        this.volume = this.clampVolume(saved.volume);
        this.theme = this.validateTheme(saved.theme);
    }

    update(updates) {
        Object.keys(updates).forEach(key => {
            if (key === 'volume') {
                this.volume = this.clampVolume(updates[key]);
            } else if (key === 'theme') {
                this.theme = this.validateTheme(updates[key]);
            } else if (this[key] !== undefined) {
                this[key] = updates[key];
            }
        });
    }

    clampVolume(value) {
        const num = Number(value);
        return isNaN(num) ? 80 : Math.min(100, Math.max(0, num));
    }

    validateTheme(theme) {
        return AVAILABLE_THEMES.includes(theme) ? theme : 'cyberpunk';
    }

    toJSON() {
        return {
            sound: this.sound,
            vibration: this.vibration,
            theme: this.theme,
            showArrows: this.showArrows,
            volume: this.volume
        };
    }
}
