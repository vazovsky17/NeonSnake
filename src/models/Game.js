// src/models/Game.js

import Snake from '../game/Snake.js';
import Food from '../game/Food.js';
import Grid from '../game/Grid.js';

/**
 * Модель игры "Neon Snake"
 * Инкапсулирует состояние и логику, используя отдельные классы.
 */
export default class Game {
    constructor({ width = 16, height = 16 } = {}) {
        this.grid = new Grid(width, height);
        this.snake = new Snake([{ x: 10, y: 10 }], { x: 1, y: 0 });
        this.food = Food.generate(width, height, this.snake.body);

        this.score = 0;
        this.level = 1;
        this.isRunning = false;
        this.isPaused = false;

        // Настройки
        this.initialSpeed = 150;
        this.minSpeed = 60;
        this.speed = this.initialSpeed;

        // Конфигурация
        this.wallMode = 'wrap'; // 'wrap' | 'solid' | 'kill'
    }

    /**
     * Возвращает множитель скорости относительно начальной
     * Например: 150 / 100 = x1.5
     * @returns {number}
     */
    get speedFactor() {
        return this.initialSpeed / this.speed;
    }

    // --- Управление направлением ---
    setDirection(dir) {
        this.snake.setDirection(dir);
    }

    // --- Обновление игры ---
    update() {
        if (!this.isRunning || this.isPaused) return null;

        // Двигаем змею
        const { head, ate, collision } = this.snake.move(this.food, this.wallMode, this.grid);

        if (collision) {
            this.isRunning = false;
            return { type: 'gameover', score: this.score, level: this.level };
        }

        if (ate) {
            // Растим и генерируем новую еду
            this.snake.grow();
            this.food = Food.generate(this.grid.width, this.grid.height, this.snake.body);
            this.score++;

            const oldLevel = this.level;
            this.level = this.getLevelFromScore(this.score);

            if (this.level > oldLevel) {
                this.speed = Math.max(this.minSpeed, this.initialSpeed - (this.level - 1) * 10);
                return { type: 'levelup', level: this.level, score: this.score };
            }

            return { type: 'eat', score: this.score };
        }

        return null;
    }

    // --- Уровни ---
    getLevelFromScore(score) {
        let level = 1;
        while (score >= this.getRequiredScoreForLevel(level + 1)) {
            level++;
        }
        return level;
    }

    getRequiredScoreForLevel(level) {
        if (level === 1) return 0;
        const base = 3;
        const multiplier = 1.5;
        return Math.floor(base * (Math.pow(multiplier, level - 1) - 1) / (multiplier - 1));
    }

    /**
     * Возвращает прогресс до следующего уровня (от 0 до 1)
     * Теперь корректно использует getRequiredScoreForLevel
     * @returns {{ value: number, label: string }}
     */
    getLevelProgress() {
        const currentLevelScore = this.getRequiredScoreForLevel(this.level);
        const nextLevelScore = this.getRequiredScoreForLevel(this.level + 1);
        const currentScoreForLevel = this.score - currentLevelScore;
        const totalNeededForNextLevel = nextLevelScore - currentLevelScore;

        const progress = totalNeededForNextLevel > 0
            ? Math.max(0, Math.min(1, currentScoreForLevel / totalNeededForNextLevel))
            : 1;

        const label = `${currentScoreForLevel}/${totalNeededForNextLevel}`;

        return {
            value: progress,
            label: label
        };
    }

    // --- Управление состоянием ---
    start() {
        this.isRunning = true;
        this.isPaused = false;
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            return { type: 'pause', score: this.score, level: this.level };
        }
        return null;
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            return { type: 'resume' };
        }
        return null;
    }

    reset() {
        this.snake.reset();
        this.food = Food.generate(this.grid.width, this.grid.height, this.snake.body);
        this.score = 0;
        this.level = 1;
        this.speed = this.initialSpeed;
        this.isPaused = false;
        this.isRunning = false;
    }

    // --- Сериализация ---
    toJSON() {
        return {
            snake: this.snake.body,
            food: this.food,
            score: this.score,
            level: this.level,
            direction: this.snake.direction,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }
}
