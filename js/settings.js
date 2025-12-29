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

// === 🛑 Сброс с подтверждением через ввод "RESET" и таймером исчезновения ===
function resetAllData() {
    const modal = document.getElementById('settingsModal');
    const content = modal?.querySelector('.settings-content') || modal;

    // Если уже показано — не создаём повторно
    if (document.getElementById('resetConfirmation')) {
        return;
    }

    const buttons = document.querySelectorAll('#resetDataBtn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });

    const confirmDiv = document.createElement('div');
    confirmDiv.id = 'resetConfirmation';
    confirmDiv.style = `
        margin: 20px 16px;
        padding: 16px;
        background: rgba(255, 0, 0, 0.1);
        border: 1px solid var(--neon-red);
        border-radius: 10px;
        color: var(--neon-red);
        font-family: 'Orbitron', sans-serif;
        text-align: center;
        transition: all 0.3s ease;
    `;

    confirmDiv.innerHTML = `
        <p style="margin: 0 0 12px; font-size: 14px;">
            ⚠️ Type <strong>RESET</strong> to confirm:
        </p>
        <input id="resetInput" type="text" 
               style="width: 100%; padding: 10px; margin-bottom: 10px; font: 14px 'Orbitron';
                      text-align: center; border: 1px solid var(--neon-pink); border-radius: 6px;
                      background: rgba(0,0,0,0.3); color: white; outline: none;"
               placeholder="Enter RESET">
        <button id="confirmResetBtn" disabled
                style="padding: 8px 16px; font: bold 12px 'Orbitron'; color: #fff;
                       background: var(--neon-red); border: 1px solid #ff3366;
                       border-radius: 6px; cursor: not-allowed; opacity: 0.5;">
            Delete All Data
        </button>
        <div id="resetTimer" style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
            Time left: <strong>10</strong> sec
        </div>
    `;

    content.appendChild(confirmDiv);

    const input = document.getElementById('resetInput');
    const button = document.getElementById('confirmResetBtn');
    const timerElement = document.getElementById('resetTimer');
    const timerSeconds = timerElement.querySelector('strong');

    let timeLeft = 10;
    const timer = setInterval(() => {
        timeLeft--;
        timerSeconds.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            confirmDiv.style.opacity = '0';
            confirmDiv.style.transform = 'scale(0.95)';
            setTimeout(() => {
                confirmDiv.remove();
                buttons.forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
                if (typeof showSnackbar === 'function') {
                    showSnackbar('⏱️ Reset cancelled', 'info');
                }
            }, 300);
        }
    }, 1000);

    // Очистка таймера при закрытии модалки
    const clearTimer = () => clearInterval(timer);

    modal?.addEventListener('click', function onModalClose(e) {
        if (e.target === modal) {
            clearTimer();
        }
    });

    document.getElementById('settingsCloseBtn')?.addEventListener('click', clearTimer);

    // Ввод
    input.addEventListener('input', () => {
        const value = input.value.trim();
        if (value === 'RESET') {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.backgroundColor = '#ff0000';
        } else {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.backgroundColor = 'var(--neon-red)';
        }
    });

    button.addEventListener('click', async () => {
        clearInterval(timer); // Останавливаем таймер

        const tg = window.Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id || '';

        try {
            // 1. Очищаем localStorage
            [
                'snakeHighScore',
                'totalGames',
                'totalScore',
                'snakeLeaderboard',
                'appSettings',
                `user_stats_${userId}`
            ].forEach(key => localStorage.removeItem(key));

            // 2. Очищаем Telegram Cloud Storage
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud('snakeLeaderboard', null);
                window.saveToCloud('appSettings', null);
                window.saveToCloud(`user_stats_${userId}`, null);
            }

            // 3. Сбрасываем кэш
            if (typeof window.resetAppCache === 'function') {
                window.resetAppCache();
            }

            // 4. Обновляем UI
            const statsContent = document.getElementById('statsContent');
            if (statsContent) {
                statsContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--neon-blue); opacity: 0.8;">
                        <p style="font-family: 'Orbitron', sans-serif; font-size: 18px;">🗑️ Data Cleared</p>
                        <p style="font-size: 14px;">Start fresh!</p>
                    </div>`;
            }

            // 5. Уведомление
            if (typeof showSnackbar === 'function') {
                showSnackbar('🧹 All data reset!', 'info');
            }

            // 6. Звук и вибрация
            if (window.soundManager?.play) window.soundManager.play('error');
            if (window.appSettings.vibration && tg?.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('error');
            }

            // 7. Удаляем форму
            confirmDiv.remove();

            // 8. Закрываем модалку
            modal?.classList.remove('show');

        } catch (err) {
            console.error('Reset failed', err);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Error resetting data', 'error');
            }
        }
    });

    // Фокус на поле ввода
    input.focus();

    // Вибрация и звук при открытии
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('warning');
    }
    if (window.soundManager?.play) {
        window.soundManager.play('error');
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