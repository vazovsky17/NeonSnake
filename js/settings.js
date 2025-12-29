// === 🛠 Глобальные настройки приложения ===
window.appSettings = {
    sound: true,
    vibration: true,
    theme: 'neon',
    showArrows: true,
    volume: 80  // громкость в процентах
};

// === 🔧 Загрузка настроек из localStorage ===
const loadAppSettings = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const settings = {
            sound: stored.sound !== false,
            vibration: stored.vibration !== false,
            theme: stored.theme || 'neon',
            showArrows: stored.showArrows !== false,
            volume: Number(stored.volume) || 80
        };

        window.appSettings = settings;

        // Применяем тему
        document.documentElement.setAttribute('data-theme', settings.theme);

        // Применяем видимость стрелок
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.style.display = settings.showArrows ? 'grid' : 'none';
        }

        // Применяем громкость
        if (window.soundManager && typeof window.soundManager.setVolume === 'function') {
            window.soundManager.setVolume(settings.volume / 100);
        }

        // Восстанавливаем UI
        restoreSettingsUI(settings);
    } catch (e) {
        console.warn('Failed to load settings', e);
        // Дефолтные настройки
        window.appSettings = { sound: true, vibration: true, theme: 'neon', showArrows: true, volume: 80 };
        document.documentElement.setAttribute('data-theme', 'neon');
    }
};

// === 🔄 Восстановление UI — привязка событий к элементам настроек ===
const restoreSettingsUI = (settings) => {
    console.log('🔧 restoreSettingsUI вызван с:', settings);

    const soundToggle = document.getElementById('soundToggle');
    const vibrationToggle = document.getElementById('vibrationToggle');
    const showArrowsToggle = document.getElementById('showArrowsCheckbox');
    const volumeRange = document.getElementById('volumeRange');
    const volumeValue = document.getElementById('volumeValue');

    if (!soundToggle) console.warn('❌ #soundToggle не найден');
    if (!vibrationToggle) console.warn('❌ #vibrationToggle не найден');
    if (!showArrowsToggle) console.warn('❌ #showArrowsCheckbox не найден');
    if (!volumeRange) console.warn('❌ #volumeRange не найден');
    if (!volumeValue) console.warn('❌ #volumeValue не найден');

    // === Звук ===
    if (soundToggle) {
        soundToggle.checked = settings.sound;
        soundToggle.onchange = () => {
            window.appSettings.sound = soundToggle.checked;
            saveAppSettings();
            console.log('🔊 Sound:', window.appSettings.sound);
        };
    }

    // === Вибрация ===
    if (vibrationToggle) {
        vibrationToggle.checked = settings.vibration;
        vibrationToggle.onchange = () => {
            window.appSettings.vibration = vibrationToggle.checked;
            saveAppSettings();
            console.log('📱 Vibration:', window.appSettings.vibration);
        };
    }

    // === Показ стрелок ===
    if (showArrowsToggle) {
        showArrowsToggle.checked = settings.showArrows;
        showArrowsToggle.onchange = () => {
            const controls = document.querySelector('.controls');
            const newValue = showArrowsToggle.checked;
            window.appSettings.showArrows = newValue;
            if (controls) {
                controls.style.display = newValue ? 'grid' : 'none';
            }
            saveAppSettings();
            console.log('➡️ Arrows:', newValue ? 'visible' : 'hidden');
        };
    }

    // === Громкость ===
    if (volumeRange && volumeValue) {
        volumeRange.value = settings.volume;
        volumeValue.textContent = `${settings.volume}%`;

        // Отображаем значение при движении
        volumeRange.oninput = () => {
            volumeValue.textContent = `${volumeRange.value}%`;
        };

        // Сохраняем при отпускании
        volumeRange.onchange = () => {
            const value = Number(volumeRange.value);
            window.appSettings.volume = value;
            saveAppSettings();

            // Применяем громкость
            if (window.soundManager && typeof window.soundManager.setVolume === 'function') {
                window.soundManager.setVolume(value / 100);
            }

            console.log('🔊 Volume set to:', value + '%');
        };
    }
};

// === 💾 Сохранение настроек в localStorage ===
const saveAppSettings = () => {
    try {
        localStorage.setItem('appSettings', JSON.stringify(window.appSettings));
    } catch (e) {
        console.warn('Failed to save settings', e);
    }
};

// === 🎯 Открытие модалки настроек ===
document.getElementById('settingsBtn')?.addEventListener('click', () => {
    const tg = window.Telegram?.WebApp;

    // Звук и вибрация (если включены)
    if (window.soundManager?.play && window.appSettings?.sound) {
        window.soundManager.play('click');
    }
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    // Поставить на паузу, если игра запущена
    if (window.isGameRunning && !window.isPaused && typeof window.togglePause === 'function') {
        window.togglePause();
    }

    // Показать модалку
    document.getElementById('settingsModal')?.classList.add('show');
});

// === ❌ Закрытие модалки ===
document.getElementById('settingsCloseBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('show');
});

// Закрытие по клику на фон
document.getElementById('settingsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        document.getElementById('settingsModal')?.classList.remove('show');
    }
});

// === 🗑️ Сброс всех данных ===
function resetAllData() {
    if (document.getElementById('resetModal')) return;

    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id || '';

    // --- Создание модалки подтверждения ---
    const modal = document.createElement('div');
    modal.id = 'resetModal';
    modal.style = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        font-family: 'Orbitron', sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style = `
        width: 90%;
        max-width: 400px;
        background: #0a0f2c;
        border: 2px solid var(--neon-red);
        border-radius: 16px;
        padding: 24px 20px;
        color: white;
        text-align: center;
        box-shadow: 0 0 30px rgba(255, 0, 100, 0.5);
        transform: scale(0.9);
        transition: transform 0.3s ease;
    `;

    dialog.innerHTML = `
        <h3 style="margin: 0 0 16px; color: var(--neon-red); font-size: 18px;">
            ⚠️ Confirm Reset
        </h3>
        <p style="margin: 0 0 16px; font-size: 14px; opacity: 0.9;">
            This will erase all your data.
            <br>Type <strong style="color: #ff3366;">RESET</strong> to confirm.
        </p>
        <input id="resetInput" type="text"
               style="width: 100%; padding: 12px; margin-bottom: 12px; font: 14px 'Orbitron';
                      text-align: center; border: 1px solid var(--neon-pink); border-radius: 6px;
                      background: rgba(0,0,0,0.4); color: white; outline: none;"
               placeholder="Enter RESET">
        <button id="confirmResetBtn" disabled
                style="padding: 10px 20px; font: bold 13px 'Orbitron'; color: white;
                       background: #330000; border: 1px solid var(--neon-red);
                       border-radius: 6px; cursor: not-allowed; opacity: 0.5; width: 100%;">
            Delete All Data
        </button>
        <div id="resetTimer" style="margin-top: 12px; font-size: 13px; color: var(--neon-blue);">
            Auto-cancel in: <strong>10</strong> sec
        </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const input = document.getElementById('resetInput');
    const button = document.getElementById('confirmResetBtn');
    const timerSeconds = dialog.querySelector('#resetTimer strong');

    // --- Анимация появления ---
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
        dialog.style.transform = 'scale(1)';
    }, 10);

    // --- Таймер авто-отмены ---
    let timeLeft = 10;
    const timer = setInterval(() => {
        timeLeft--;
        timerSeconds.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            closeResetModal();
            if (typeof showSnackbar === 'function') {
                showSnackbar('⏱️ Reset cancelled', 'info');
            }
        }
    }, 1000);

    // --- Ввод текста для подтверждения ---
    input.addEventListener('input', () => {
        button.disabled = input.value.trim() !== 'RESET';
        if (!button.disabled) {
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.background = '#600';
        } else {
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.background = '#330000';
        }
    });

    // --- Подтверждение сброса ---
    button.addEventListener('click', () => {
        clearInterval(timer);
        closeResetModal();

        try {
            // 1. Очистка localStorage
            [
                'snakeHighScore',
                'totalGames',
                'totalScore',
                'snakeLeaderboard',
                'appSettings',
                `user_stats_${userId}`
            ].forEach(key => localStorage.removeItem(key));

            // 2. Очистка облака (если есть)
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud('snakeLeaderboard', null);
                window.saveToCloud('appSettings', null);
                window.saveToCloud(`user_stats_${userId}`, null);
            }

            // 3. Сброс кэша
            if (typeof window.resetAppCache === 'function') {
                window.resetAppCache();
            }

            // 4. Обновление UI
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

            // 7. Закрыть модалку настроек
            document.getElementById('settingsModal')?.classList.remove('show');

        } catch (err) {
            console.error('Reset failed', err);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Error resetting data', 'error');
            }
        }
    });

    function closeResetModal() {
        modal.style.opacity = '0';
        dialog.style.transform = 'scale(0.95)';
        setTimeout(() => modal.remove(), 300);
    }

    // Закрытие по клику вне
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            clearInterval(timer);
            closeResetModal();
        }
    });

    input.focus();

    // Вибрация и звук при открытии
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('warning');
    }
    if (window.soundManager?.play) {
        window.soundManager.play('error');
    }
}

// === 🔗 Привязка кнопки сброса ===
document.getElementById('resetDataBtn')?.addEventListener('click', resetAllData);

// === 📦 Инициализация при загрузке DOM ===
document.addEventListener('DOMContentLoaded', () => {
    loadAppSettings();
});