// === Инициализация настроек ===
window.appSettings = JSON.parse(localStorage.getItem('appSettings') || 'null') || {
    showArrows: true,
    sound: true,
    vibration: true,
    volume: 0.8
};

// === Синхронизация: localStorage → CloudStorage ===
function syncToCloud() {
    window.saveToCloud('appSettings', JSON.stringify(window.appSettings));
}

// === Инициализация: сначала CloudStorage, потом fallback ===
function initSettings() {
     window.loadFromCloud('appSettings', (cloudValue) => {
        let parsed = null;
        if (cloudValue) {
            try {
                parsed = JSON.parse(cloudValue);
                // Валидация
                if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid JSON');
            } catch (e) {
                console.warn('Failed to parse cloud settings', e);
                parsed = null;
            }
        }

        // Приоритет: облако > localStorage
        if (parsed) {
            window.appSettings = parsed;
            localStorage.setItem('appSettings', JSON.stringify(window.appSettings)); // синхронизируем локально
        }
        // Если нет в облаке — уже есть localStorage или значения по умолчанию

        // Применяем
        applyShowArrows(window.appSettings.showArrows);
        applyVolumeUI(window.appSettings.volume);

        // Синхронизируем UI
        syncSettingsUI();
    });
}

// === Синхронизация UI ===
function syncSettingsUI() {
    const showArrowsCheckbox = document.getElementById('showArrowsCheckbox');
    const soundCheckbox = document.getElementById('soundCheckbox');
    const vibrationCheckbox = document.getElementById('vibrationCheckbox');
    const volumeRange = document.getElementById('volumeRange');
    const volumeValue = document.getElementById('volumeValue');

    if (showArrowsCheckbox) showArrowsCheckbox.checked = !!window.appSettings.showArrows;
    if (soundCheckbox) soundCheckbox.checked = !!window.appSettings.sound;
    if (vibrationCheckbox) vibrationCheckbox.checked = !!window.appSettings.vibration;

    if (volumeRange) {
        volumeRange.value = Math.round(window.appSettings.volume * 100);
        volumeRange.disabled = !window.appSettings.sound;
    }
    if (volumeValue) {
        volumeValue.textContent = `${Math.round(window.appSettings.volume * 100)}%`;
    }
    setRangeFill(volumeRange, Math.round(window.appSettings.volume * 100));
}

// === Применение настроек ===
function applyShowArrows(value) {
    const controls = document.querySelector('.controls');
    if (!controls) return;
    if (value) controls.classList.remove('hidden');
    else controls.classList.add('hidden');
}

function setRangeFill(el, percent) {
    try {
        if (!el) return;
        el.style.background = `linear-gradient(90deg, var(--neon-pink) ${percent}%, rgba(255,255,255,0.06) ${percent}%)`;
    } catch (e) {
        console.warn('Failed to set range fill', e);
    }
}

function applyVolumeUI(vol) {
    const r = document.getElementById('volumeRange');
    const v = document.getElementById('volumeValue');
    if (r) {
        r.value = Math.round(vol * 100);
        setRangeFill(r, Math.round(vol * 100));
        const label = r.closest('.settings-item');
        if (label) label.classList.toggle('disabled', !window.appSettings.sound);
    }
    if (v) v.textContent = `${Math.round(vol * 100)}%`;
    if (window.soundManager && typeof window.soundManager.setVolume === 'function') {
        window.soundManager.setVolume(vol);
    }
}

// === Сохранение настройки (в localStorage + CloudStorage) ===
function saveSetting(key, value) {
    window.appSettings[key] = value;
    localStorage.setItem('appSettings', JSON.stringify(window.appSettings));
    syncToCloud(); // отправляем в облако
}

// === Инициализация при загрузке ===
window.addEventListener('load', () => {
    initSettings(); // загружаем из облака → локально
});

// === Открытие модалки настроек ===
document.getElementById('settingsBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');

    if (isGameRunning && !isPaused) {
        togglePause();
    }

    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    syncSettingsUI(); // обновляем UI
    modal.classList.add('show');

    if (window.appSettings.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
});

// === Обработчики изменений ===

// Показ стрелок
const showArrowsCheckbox = document.getElementById('showArrowsCheckbox');
if (showArrowsCheckbox) {
    showArrowsCheckbox.addEventListener('change', (e) => {
        const enabled = !!e.target.checked;
        saveSetting('showArrows', enabled);
        applyShowArrows(enabled);

        if (window.soundManager && window.appSettings.sound) {
            window.soundManager.play('click');
        }
        if (window.appSettings.vibration && tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// Вибрация
const vibrationCheckbox = document.getElementById('vibrationCheckbox');
if (vibrationCheckbox) {
    vibrationCheckbox.addEventListener('change', (e) => {
        const enabled = !!e.target.checked;
        saveSetting('vibration', enabled);

        if (enabled && tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
}

// Звук
const soundCheckbox = document.getElementById('soundCheckbox');
if (soundCheckbox) {
    soundCheckbox.addEventListener('change', (e) => {
        const enabled = !!e.target.checked;
        saveSetting('sound', enabled);

        const volumeRange = document.getElementById('volumeRange');
        if (volumeRange) volumeRange.disabled = !enabled;

        applyVolumeUI(window.appSettings.volume);

        if (enabled && window.soundManager) {
            window.soundManager.play('click');
        }
    });
}

// Громкость
const volumeRangeEl = document.getElementById('volumeRange');
if (volumeRangeEl) {
    volumeRangeEl.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        const vol = Math.max(0, Math.min(100, val)) / 100;

        saveSetting('volume', vol);
        applyVolumeUI(vol);

        if (window.appSettings.sound && window.soundManager) {
            window.soundManager.play('click');
        }
    });
}

// === Закрытие модалки ===

// Клик вне
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        document.getElementById('settingsModal').classList.remove('show');
    }
});

// Кнопка закрытия
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', () => {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('show');

        if (window.soundManager) window.soundManager.play('click');
        if (window.appSettings.vibration && tg?.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    });
}
