// src/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Только если в Telegram — применяем стили
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#0a0e27');
        window.Telegram.WebApp.setBackgroundColor('#0a0e27');
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
