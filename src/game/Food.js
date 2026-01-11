// src/game/Food.js

export default class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Обновляет позицию
     */
    update(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Генерирует случайную еду в пределах сетки
     * @param {number} gridWidth
     * @param {number} gridHeight
     * @param {Array} snake — текущая змея (чтобы не появлялась на ней)
     * @returns {Food}
     */
    static generate(gridWidth, gridHeight, snake) {
        let x, y;
        let valid = false;

        while (!valid) {
            x = Math.floor(Math.random() * gridWidth);
            y = Math.floor(Math.random() * gridHeight);

            valid = true;
            for (const segment of snake) {
                if (segment.x === x && segment.y === y) {
                    valid = false;
                    break;
                }
            }
        }

        return new Food(x, y);
    }
}
