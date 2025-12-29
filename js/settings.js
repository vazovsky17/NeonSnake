// === 🛑 Сброс с модальным подтверждением поверх экрана ===
function resetAllData() {
    // Если уже есть — не создаём повторно
    if (document.getElementById('resetModal')) {
        return;
    }

    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id || '';

    // --- Создаём модальное окно ---
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

    // --- Элементы ---
    const input = document.getElementById('resetInput');
    const button = document.getElementById('confirmResetBtn');
    const timerSeconds = dialog.querySelector('#resetTimer strong');

    // --- Анимация появления ---
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'all';
        dialog.style.transform = 'scale(1)';
    }, 10);

    // --- Таймер ---
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

    // --- Ввод ---
    input.addEventListener('input', () => {
        const value = input.value.trim();
        if (value === 'RESET') {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.background = '#600';
        } else {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.background = '#330000';
        }
    });

    // --- Подтверждение ---
    button.addEventListener('click', async () => {
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

            // 2. Очистка Telegram Cloud
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

            // 7. Закрытие настроек
            document.getElementById('settingsModal')?.classList.remove('show');

        } catch (err) {
            console.error('Reset failed', err);
            if (typeof showSnackbar === 'function') {
                showSnackbar('Error resetting data', 'error');
            }
        }
    });

    // --- Закрытие ---
    function closeResetModal() {
        modal.style.opacity = '0';
        dialog.style.transform = 'scale(0.95)';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    // Закрытие по клику вне
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            clearInterval(timer);
            closeResetModal();
        }
    });

    // Фокус на ввод
    input.focus();

    // Звук и вибрация
    if (window.appSettings?.vibration && tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('warning');
    }
    if (window.soundManager?.play) {
        window.soundManager.play('error');
    }
}