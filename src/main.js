// src/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Только если в Telegram — применяем стили
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        // Try to pick a color from the current theme so Telegram UI matches
        const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--grid-bg').trim() || '#0a0e27';
        window.Telegram.WebApp.setHeaderColor(themeBg);
        window.Telegram.WebApp.setBackgroundColor(themeBg);
    }

    // Загружаем приложение в любом случае
    import('./core/App.js')
        .then(({ default: App }) => {
            window.app = new App();
        })
        .catch(err => {
            console.error('❌ Failed to load App:', err);
        });
});
