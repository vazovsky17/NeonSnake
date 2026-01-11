// src/game/Grid.js

export default class Grid {
    constructor(width = 16, height = 16) {
        this.width = width;
        this.height = height;
    }

    /**
     * Проверяет, находится ли позиция внутри
     */
    contains(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Возвращает случайную позицию
     */
    randomPosition() {
        return {
            x: Math.floor(Math.random() * this.width),
            y: Math.floor(Math.random() * this.height)
        };
    }

    /**
     * "Тороидальный" переход (сквозь стены)
     */
    wrap(x, y) {
        return {
            x: (x + this.width) % this.width,
            y: (y + this.height) % this.height
        };
    }
}
