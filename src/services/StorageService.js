// src/services/StorageService.js

export default class StorageService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.cloudEnabled = this.isCloudStorageSupported();
    }

    /**
     * Проверяет, доступен ли CloudStorage (только в Telegram v7.0+)
     * @returns {boolean}
     */
    isCloudStorageSupported() {
        if (!this.tg || !this.tg.CloudStorage) return false;
        const version = this.tg.version;
        return version && parseFloat(version) >= 7.0;
    }

    /**
     * Сохраняет данные: в localStorage и (если можно) в облако
     */
    async save(key, data) {
        const serialized = JSON.stringify(data);

        try {
            // 1. Сохраняем в localStorage (работает везде)
            localStorage.setItem(key, serialized);
        } catch (e) {
            console.warn(`💾 Failed to save to localStorage: ${key}`, e);
        }

        // 2. Пытаемся сохранить в Telegram Cloud (только если доступно)
        if (this.cloudEnabled) {
            try {
                this.tg.CloudStorage.setItem(key, serialized, (err) => {
                    if (err) {
                        console.warn(`☁️ CloudStorage save failed for ${key}`, err);
                    } else {
                        console.log(`☁️ Saved to cloud: ${key}`);
                    }
                });
            } catch (e) {
                console.error(`☁️ Critical error calling CloudStorage.setItem for ${key}`, e);
            }
        }
    }

    /**
     * Загружает данные: сначала пробует облако (если в Telegram), потом localStorage
     * Гарантирует, что Promise всегда resolve'ится
     */
    async load(key) {
        return new Promise((resolve) => {
            let loaded = null;
            let completed = 0;
            const totalSources = this.cloudEnabled ? 2 : 1;

            const finish = () => {
                if (++completed >= totalSources) {
                    // Возвращаем, что удалось найти
                    resolve(loaded);
                }
            };

            // 1. Попытка из Telegram CloudStorage
            if (this.cloudEnabled) {
                try {
                    this.tg.CloudStorage.getItem(key, (err, value) => {
                        if (!err && value) {
                            try {
                                loaded = JSON.parse(value);
                                console.log(`✅ Loaded from CloudStorage: ${key}`);
                            } catch (e) {
                                console.warn(`☁️ CloudStorage: parse error for ${key}`, e);
                            }
                        } else if (err) {
                            console.warn(`☁️ CloudStorage getItem error for ${key}:`, err);
                        }
                        finish();
                    });
                } catch (e) {
                    console.error(`☁️ Failed to call CloudStorage.getItem for ${key}`, e);
                    finish(); // Не висим — идём дальше
                }
            } else {
                finish(); // Пропускаем облако, если не в Telegram или версия <7.0
            }

            // 2. Загрузка из localStorage (работает везде)
            try {
                const local = localStorage.getItem(key);
                if (local) {
                    const parsed = JSON.parse(local);

                    if (!loaded) {
                        loaded = parsed;
                        console.log(`✅ Loaded from localStorage: ${key}`);
                    } else {
                        // Если в облаке уже есть данные — сравним по времени
                        const localTime = new Date(parsed.lastPlayed || 0).getTime();
                        const cloudTime = new Date(loaded.lastPlayed || 0).getTime();
                        if (localTime > cloudTime) {
                            console.log(`🔁 Local data is newer → syncing to cloud`);
                            this.save(key, parsed); // Обновим облако
                            loaded = parsed;
                        }
                    }
                }
            } catch (e) {
                console.warn(`💾 localStorage parse error for ${key}`, e);
            }
            finish();
        });
    }

    /**
     * Удаляет данные из всех доступных источников
     */
    async remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`💾 Failed to remove from localStorage: ${key}`, e);
        }

        if (this.cloudEnabled) {
            try {
                this.tg.CloudStorage.deleteItem(key, (err) => {
                    if (err) {
                        console.warn(`☁️ CloudStorage delete failed for ${key}`, err);
                    }
                });
            } catch (e) {
                console.error(`☁️ Failed to call CloudStorage.deleteItem for ${key}`, e);
            }
        }
    }
}
