const tg = window.Telegram?.WebApp;
window.tg = tg;

function saveToCloud(key, value) {
    if (!tg || !tg.CloudStorage) return;
    try {
        tg.CloudStorage.setItem(key, value, (err) => {
            if (err) console.warn('CloudStorage save error:', err);
        });
    } catch (e) {
        console.warn('CloudStorage setItem failed:', e);
    }
}

function loadFromCloud(key, callback) {
    if (!tg || !tg.CloudStorage) {
        callback(null);
        return;
    }
    try {
        tg.CloudStorage.getItem(key, (err, value) => {
            if (err || !value) {
                callback(null);
            } else {
                callback(value);
            }
        });
    } catch (e) {
        console.warn('CloudStorage getItem failed:', e);
        callback(null);
    }
}

// Show a temporary snackbar notification with type support
function showSnackbar(message, type = 'info') {
    const snackbar = document.getElementById('snackbar');
    
    // Удаляем предыдущие классы типов
    snackbar.classList.remove('show', 'success', 'info', 'error');
    
    // Устанавливаем текст и тип
    snackbar.textContent = message;
    snackbar.classList.add(type);
    
    // Отображаем
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10); // Небольшая задержка для срабатывания анимации

    // Автоматически скрываем
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => {
            snackbar.textContent = '';
        }, 300);
    }, 3000);
}

window.showSnackbar = showSnackbar;

window.saveToCloud = saveToCloud;
window.loadFromCloud = loadFromCloud;
