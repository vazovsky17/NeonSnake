// Theme management
let currentTheme = localStorage.getItem('snakeTheme') || 'cyberpunk';
document.documentElement.setAttribute('data-theme', currentTheme);

const applyTheme = (theme) => {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('snakeTheme', theme);

    // Update active theme option
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === theme) {
            option.classList.add('active');
        }
    });

    // Haptic feedback (respect settings)
    if (window.appSettings?.vibration && typeof tg !== 'undefined' && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
};

// Theme button handlers
document.getElementById('themeBtn').addEventListener('click', () => {
    if (window.soundManager) window.soundManager.play('click');

    // Поставить на паузу
    if (isGameRunning && !isPaused) {
        togglePause();
    }

    const modal = document.getElementById('themeModal');
    if (!modal) return;

    modal.classList.add('show');

    if (window.appSettings?.vibration && typeof tg !== 'undefined' && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
});

document.getElementById('themeCloseBtn').addEventListener('click', () => {
    document.getElementById('themeModal').classList.remove('show');
});

// Theme selection
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        applyTheme(option.dataset.theme);
    });
});

// Close modal on outside click
document.getElementById('themeModal').addEventListener('click', (e) => {
    if (e.target.id === 'themeModal') {
        document.getElementById('themeModal').classList.remove('show');
    }
});

// Apply saved theme on load
applyTheme(currentTheme);
