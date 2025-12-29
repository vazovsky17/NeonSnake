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

        if (parsed) {
            window.appSettings = parsed;
            localStorage.setItem('appSettings', JSON.stringify(window.appSettings));
        }

        applyShowArrows(window.appSettings.showArrows);
        applyVolumeUI(window.appSettings.volume);
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
    if (!el) return;
    el.style.background = `linear-gradient(90deg, var(--neon-pink) ${percent}%, rgba(255,255,255,0.06) ${percent}%)`;
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

// === Сохранение настройки ===
function saveSetting(key, value) {
    window.appSettings[key] = value;
    localStorage.setItem('appSettings', JSON.stringify(window.appSettings));
    syncToCloud();
}

// === 🧹 Полная очистка: всё подряд ===
function resetAllData() {
    if (!confirm('⚠️ Are you sure? This will delete ALL data — including cloud, settings, scores. Cannot be undone.')) {
        return;
    }

    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id || '';
    const keysToDelete = [
        'snakeHighScore',
        'totalGames',
        'totalScore',
        'snakeLeaderboard',
        'appSettings',
        `user_stats_${userId}`
    ];

    try {
        // 1. Очищаем localStorage
        keysToDelete.forEach(key => localStorage.removeItem(key));

        // 2. Очищаем Telegram Cloud
        if (typeof window.saveToCloud === 'function') {
            keysToDelete.forEach(key => window.saveToCloud(key, null));
        }

        // 3. Сбрасываем кэш
        if (typeof window.resetAppCache === 'function') {
            window.resetAppCache();
        }

        // 4. Обновляем UI
        document.getElementById('statsContent')?.insertAdjacentHTML('afterbegin', `
            <div style="text-align:center; color:var(--neon-blue); padding:20px;">
                <p>🗑️ All data cleared</p>
            </div>`);
        document.getElementById('settingsModal')?.classList.remove('show');

        // 5. Уведомление
        if (typeof showSnackbar === 'function') {
            showSnackbar('🧹 All data reset!', 'info');
        }

        // 6. Звук и вибрация
        if (window.soundManager?.play) window.soundManager.play('error');
        if (window.appSettings?.vibration && tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }

    } catch (err) {
        console.error('Reset failed', err);
        if (typeof showSnackbar === 'function') {
            showSnackbar('Reset failed', 'error');
        }
    }
}

// === Инициализация ===
window.addEventListener('load', initSettings);

// === UI ===
document.getElementById('settingsBtn')?.addEventListener('click', () => {
    if (window.soundManager?.play) window.soundManager.play('click');
    if (window.isGameRunning && !window.isPaused) window.togglePause();

    document.getElementById('settingsModal')?.classList.add('show');
    syncSettingsUI();

    if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});

// Обработчики
document.getElementById('showArrowsCheckbox')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    saveSetting('showArrows', enabled);
    applyShowArrows(enabled);
    if (window.soundManager && window.appSettings.sound) window.soundManager.play('click');
    if (window.appSettings.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});

document.getElementById('vibrationCheckbox')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    saveSetting('vibration', enabled);
    if (enabled && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});

document.getElementById('soundCheckbox')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    saveSetting('sound', enabled);
    const r = document.getElementById('volumeRange');
    if (r) r.disabled = !enabled;
    applyVolumeUI(window.appSettings.volume);
    if (enabled && window.soundManager) window.soundManager.play('click');
});

document.getElementById('volumeRange')?.addEventListener('input', (e) => {
    const vol = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
    saveSetting('volume', vol);
    applyVolumeUI(vol);
    if (window.appSettings.sound && window.soundManager) window.soundManager.play('click');
});

document.getElementById('resetDataBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAllData();
});

document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        document.getElementById('settingsModal')?.classList.remove('show');
    }
});

document.getElementById('settingsCloseBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('show');
    if (window.soundManager?.play) window.soundManager.play('click');
    if (window.appSettings?.vibration && window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
});