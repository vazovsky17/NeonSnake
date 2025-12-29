// === Инициализация настроек ===
window.appSettings = JSON.parse(localStorage.getItem('appSettings') || 'null') || {
    showArrows: true,
    sound: true,
    vibration: true,
    volume: 0.8
};

// === Синхронизация: localStorage → CloudStorage ===
function syncToCloud() {
    if (typeof window.saveToCloud === 'function') {
        window.saveToCloud('appSettings', JSON.stringify(window.appSettings));
    }
}

// === Инициализация: сначала CloudStorage, потом fallback ===
function initSettings() {
    window.loadFromCloud('appSettings', (cloudValue) => {
        let parsed = null;
        if (cloudValue) {
            try {
                parsed = JSON.parse(cloudValue);
                if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid JSON');
            } catch (e) {
                console.warn('Failed to parse cloud settings', e);
                parsed = null;
            }
        }

        // Приоритет: облако > localStorage
        if (parsed) {
            window.appSettings = parsed;
            localStorage.setItem('appSettings', JSON.stringify(window.appSettings));
        }

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
    syncToCloud();
}

// === 🟢 Сброс всех данных (локальных + Telegram Cloud) ===
function resetAllData() {
    if (!confirm('⚠️ Are you sure? This will delete:\n- Your high score\n- Game progress\n- Settings\n\nThis cannot be undone.')) {
        return;
    }

    const tg = window.Telegram?.WebApp;

    try {
        // 1. Очищаем localStorage
        localStorage.removeItem('snakeHighScore');
        localStorage.removeItem('totalGames');
        localStorage.removeItem('totalScore');
        localStorage.removeItem('snakeLeaderboard');
        localStorage.removeItem('appSettings');
        localStorage.removeItem('user_stats_' + (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || ''));

        // 2. Очищаем Telegram Cloud Storage
        if (typeof window.saveToCloud === 'function') {
            window.saveToCloud('snakeLeaderboard', null);
            window.saveToCloud('appSettings', null);
            window.saveToCloud('user_stats_' + (window.Telegram?.WebApp?.initDataUnsafe?.user?.id || ''), null);
        }

        // 3. Сбрасываем кэш в stats.js
        if (typeof window.loadLeaderboard === 'function') {
            window.loadLeaderboard = () => Promise.resolve([]);
        }
        if (typeof window.loadPersonalStats === 'function') {
            window.loadPersonalStats = () => Promise.resolve(null);
        }

        // 4. Уведомление
        if (typeof showSnackbar === 'function') {
            showSnackbar('🧹 Data reset!', 'info');
        }

        // 5. Звук и вибрация
        if (window.soundManager && window.appSettings.sound) {
            window.soundManager.play('error');
        }
        if (window.appSettings.vibration && tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }

        // 6. Закрываем модалку
        document.getElementById('settingsModal')?.classList.remove('show');

        // 7. Обновляем UI (если есть stats)
        if (document.getElementById('statsContent')) {
            document.getElementById('statsContent').innerHTML = '<div style="text-align:center; padding:20px; color:#888;">No data yet</div>';
        }

    } catch (err) {
        console.error('Failed to reset data', err);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Error resetting data', 'error');
        }
    }
}

// === Инициализация при загрузке ===
window.addEventListener('load', () => {
    initSettings();
});

// === Открытие модалки настроек ===
document.getElementById('settingsBtn')?.addEventListener('click', () => {
    if (window.soundManager?.play) window.soundManager.play('click');

    if (window.isGameRunning && !window.isPaused && window.togglePause) {
        window.togglePause();
    }

    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    syncSettingsUI();
    modal.classList.add('show');

    const tg = window.Telegram?.WebApp;
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
});

// === Обработчики изменений ===

// Показ стрелок
document.getElementById('showArrowsCheckbox')?.addEventListener('change', (e) => {
    const enabled = !!e.target.checked;
    saveSetting('showArrows', enabled);
    applyShowArrows(enabled);

    if (window.soundManager && window.appSettings.sound) {
        window.soundManager.play('click');
    }
    if (window.appSettings.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});

// Вибрация
document.getElementById('vibrationCheckbox')?.addEventListener('change', (e) => {
    const enabled = !!e.target.checked;
    saveSetting('vibration', enabled);

    if (enabled && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});

// Звук
document.getElementById('soundCheckbox')?.addEventListener('change', (e) => {
    const enabled = !!e.target.checked;
    saveSetting('sound', enabled);

    const volumeRange = document.getElementById('volumeRange');
    if (volumeRange) volumeRange.disabled = !enabled;

    applyVolumeUI(window.appSettings.volume);

    if (enabled && window.soundManager) {
        window.soundManager.play('click');
    }
});

// Громкость
document.getElementById('volumeRange')?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    const vol = Math.max(0, Math.min(100, val)) / 100;

    saveSetting('volume', vol);
    applyVolumeUI(vol);

    if (window.appSettings.sound && window.soundManager) {
        window.soundManager.play('click');
    }
});

// === 🟢 Кнопка сброса данных ===
document.getElementById('resetDataBtn')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Не закрываем модалку сразу
    if (window.soundManager?.play) window.soundManager.play('error');
    if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }

    resetAllData();
});

// === Закрытие модалки ===
document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        document.getElementById('settingsModal')?.classList.remove('show');
    }
});

document.getElementById('settingsCloseBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('show');

    if (window.soundManager?.play) window.soundManager.play('click');
    if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});
