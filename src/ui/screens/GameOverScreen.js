// src/ui/screens/GameOverScreen.js

/**
 * Экран "Игра окончена" — с кнопкой SHARE в Telegram
 */
export default class GameOverScreen {
    constructor(app) {
        this.app = app;
        this.eventBus = app.eventBus;
        this.user = app.user;

        this.score = 0;
        this.level = 1;
        this.isNewRecord = false;

        this.element = document.getElementById('gameOverScreen');
        this.isVisible = false;

        // Кнопки (DOM-элементы)
        this.restartBtn = null;
        this.menuBtn = null;
        this.leaderboardBtn = null;
        this.shareBtn = null; // ← новая кнопка

        this.init();
    }

    init() {
        if (!this.element) {
            this.createElement();
        }

        this.restartBtn = this.element.querySelector('#gameOverRestart');
        this.menuBtn = this.element.querySelector('#gameOverMenu');
        this.leaderboardBtn = this.element.querySelector('#gameOverLeaderboard');
        this.shareBtn = this.element.querySelector('#gameOverShare'); // ← инициализация

        // Применяем «idle» эффект к кнопке Play Again
        if (this.restartBtn) this.restartBtn.classList.add('idle');

        this.bindEvents();
    }

    createElement() {
        const el = document.createElement('div');
        el.id = 'gameOverScreen';
        el.className = 'screen';
        el.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title">GAME OVER</h2>

                <div class="modal-stats">
                    <div class="stat-line">
                        <span class="label">Score</span>
                        <span class="value" id="finalScore">0</span>
                    </div>
                    <div class="stat-line">
                        <span class="label">Level</span>
                        <span class="value" id="finalLevel">1</span>
                    </div>
                </div>

                <div id="recordBadge" class="badge hidden">★ NEW RECORD!</div>

                <div class="btn-group">
                    <button id="gameOverRestart" class="hacker-btn">PLAY AGAIN</button>
                    <button id="gameOverLeaderboard" class="hacker-btn">LEADERBOARD</button>
                    <button id="gameOverShare" class="hacker-btn">SHARE</button>
                </div>

                <div class="modal-hint">
                    <small>ENTER: Play | L: Leaderboard | S: Share</small>
                </div>

                <div class="modal-footer">
                    <div class="version">v1.0</div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.element = el;
    }

    bindEvents() {
        // Обработчики кнопок
        this.restartBtn?.addEventListener('click', () => this.restart());
        this.menuBtn?.addEventListener('click', () => this.toMenu());
        this.leaderboardBtn?.addEventListener('click', () => this.toLeaderboard());
        this.shareBtn?.addEventListener('click', () => this.shareScore()); // ← обработчик

        // Событие окончания игры
        this.eventBus.on('game:gameover', (data) => {
            this.score = data.score || 0;
            this.level = data.level || 1;
            this.isNewRecord = this.score > (this.user?.highScore || 0);
            this.render();
            this.show();
        });

        // Управление клавишами
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            switch (e.code) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.restart();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    this.toLeaderboard();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.shareScore();
                    break;
            }
        });
    }

    render() {
        const scoreEl = this.element.querySelector('#finalScore');
        const levelEl = this.element.querySelector('#finalLevel');
        const recordBadge = this.element.querySelector('#recordBadge');

        if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
        if (levelEl) levelEl.textContent = this.level;

        // Показываем рекорд
        if (recordBadge) {
            recordBadge.classList.toggle('hidden', !this.isNewRecord);
            recordBadge.style.display = this.isNewRecord ? 'flex' : 'none';
        }
    }

    show() {
        if (this.isVisible) return;
        this.isVisible = true;

        requestAnimationFrame(() => {
            this.element.classList.add('show');
            this.element.style.display = 'flex';
        });

        if (this.app.soundService) {
            this.app.soundService.play('game_over');
        }
    }

    hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.element.classList.remove('show');

        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);

        if (this.app.soundService) {
            this.app.soundService.play('menu_close');
        }
    }

    restart() {
        this.hide();
        this.eventBus.emit('game:restart');
        this.eventBus.emit('game:start');
    }

    toLeaderboard() {
        this.hide();
        this.eventBus.emit('screen:leaderboard');
        this.app.eventBus.emit('snackbar:show', {
            message: 'Leaderboard coming soon...',
            type: 'info'
        });
    }

    // 🔗 Функция для шаринга в Telegram
    shareScore() {
        const score = this.score.toLocaleString();
        const text = `I scored ${score} in NEON SNAKE! Try to beat me!`;
        const url = 't.me/vazovskyapps_bot/neonsnake'; // ← замените на настоящую ссылку
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

        window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    }
}
