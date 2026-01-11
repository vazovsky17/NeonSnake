// src/game/Snake.js

export default class Snake {
    constructor(body = [{ x: 0, y: 0 }], direction = { x: 1, y: 0 }) {
        this.body = body;
        this.direction = direction;
        this.growNext = false;
    }

    // Добавьте этот геттер
    get body() {
        return this._body || [];
    }

    set body(value) {
        this._body = value;
    }

    setDirection(newDir) {
        const { x, y } = this.direction;
        if ((x !== 0 && newDir.x !== 0) || (y !== 0 && newDir.y !== 0)) {
            return; // запрет 180°
        }
        this.direction = newDir;
    }

    move(food, wallMode, grid) {
        const head = { ...this.body[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        let nextHead = head;

        // Обработка границ
        switch (wallMode) {
            case 'wrap':
                nextHead = grid.wrap(head.x, head.y);
                break;
            case 'kill':
                if (head.x < 0 || head.x >= grid.width || head.y < 0 || head.y >= grid.height) {
                    return { head, ate: false, collision: true };
                }
                break;
            case 'solid':
                nextHead.x = Math.max(0, Math.min(grid.width - 1, head.x));
                nextHead.y = Math.max(0, Math.min(grid.height - 1, head.y));
                break;
        }

        // Проверка столкновения с телом
        for (const segment of this.body) {
            if (segment.x === nextHead.x && segment.y === nextHead.y) {
                return { head: nextHead, ate: false, collision: true };
            }
        }

        const ate = nextHead.x === food.x && nextHead.y === food.y;
        this.body.unshift(nextHead);

        if (!this.growNext) {
            this.body.pop();
        } else {
            this.growNext = false;
        }

        return { head: nextHead, ate, collision: false };
    }

    grow() {
        this.growNext = true;
    }

    reset(startPos = { x: 10, y: 10 }, direction = { x: 1, y: 0 }) {
        this.body = [startPos];
        this.direction = direction;
        this.growNext = false;
    }
}
