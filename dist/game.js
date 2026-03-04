/**
 * 五子连珠 - 马年特别版 🐴
 * 拟物风格小马主题 - 完整修复版
 */

// ==================== 常量定义 ====================
const CellColor = {
    EMPTY: 0,
    RED: 1,     // 赤兔马
    BLUE: 2,    // 蓝鬃马
    GREEN: 3,   // 青骢马
    YELLOW: 4,  // 金马
    PURPLE: 5,  // 紫骍马
    ORANGE: 6,  // 骅骝马
    CYAN: 7     // 白龙马
};

const BOARD_SIZE = 9;
const INITIAL_BALLS = 5;
const BALLS_PER_TURN = 3;
const MATCH_LENGTH = 5;

const COLOR_PALETTE = {
    [CellColor.EMPTY]: 'transparent',
    [CellColor.RED]: '#e74c3c',
    [CellColor.BLUE]: '#3498db',
    [CellColor.GREEN]: '#27ae60',
    [CellColor.YELLOW]: '#f1c40f',
    [CellColor.PURPLE]: '#9b59b6',
    [CellColor.ORANGE]: '#e67e22',
    [CellColor.CYAN]: '#1abc9c'
};

const HORSE_NAMES = {
    [CellColor.EMPTY]: '',
    [CellColor.RED]: '赤兔',
    [CellColor.BLUE]: '蓝鬃',
    [CellColor.GREEN]: '青骢',
    [CellColor.YELLOW]: '金马',
    [CellColor.PURPLE]: '紫骍',
    [CellColor.ORANGE]: '骅骝',
    [CellColor.CYAN]: '白龙'
};

// ==================== 游戏逻辑类 ====================
class LinesGame {
    constructor() {
        this.state = this.createInitialState();
        this.moveHistory = [];
        this.initGame();
    }

    createInitialState() {
        const board = Array(BOARD_SIZE)
            .fill(null)
            .map(() => Array(BOARD_SIZE).fill(CellColor.EMPTY));

        const nextBalls = this.generateRandomBalls(BALLS_PER_TURN);

        return {
            board,
            score: 0,
            nextBalls,
            selectedBall: null,
            gameOver: false
        };
    }

    initGame() {
        this.state = this.createInitialState();
        this.moveHistory = [];

        for (const color of this.generateRandomBalls(INITIAL_BALLS)) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.state.board[pos.row][pos.col] = color;
            }
        }
    }

    generateRandomBalls(count) {
        const balls = [];
        for (let i = 0; i < count; i++) {
            balls.push(Math.floor(Math.random() * 7) + 1);
        }
        return balls;
    }

    getRandomEmptyCell() {
        const emptyCells = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.state.board[row][col] === CellColor.EMPTY) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) return null;
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    selectBall(pos) {
        if (this.state.gameOver) return false;
        if (this.state.board[pos.row][pos.col] === CellColor.EMPTY) return false;

        this.state.selectedBall = pos;
        return true;
    }

    findPath(start, end) {
        if (this.state.board[end.row][end.col] !== CellColor.EMPTY) {
            return null;
        }

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const queue = [start];
        const visited = new Set();
        const parent = new Map();

        visited.add(`${start.row},${start.col}`);

        while (queue.length > 0) {
            const current = queue.shift();

            if (current.row === end.row && current.col === end.col) {
                const path = [];
                let curr = end;
                while (curr) {
                    path.unshift(curr);
                    curr = parent.get(`${curr.row},${curr.col}`);
                }
                return path;
            }

            for (const [dr, dc] of directions) {
                const newRow = current.row + dr;
                const newCol = current.col + dc;

                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) continue;

                const isTarget = newRow === end.row && newCol === end.col;
                const isEmpty = this.state.board[newRow][newCol] === CellColor.EMPTY;

                if (!isTarget && !isEmpty) continue;

                const key = `${newRow},${newCol}`;
                if (visited.has(key)) continue;

                visited.add(key);
                parent.set(key, current);
                queue.push({ row: newRow, col: newCol });
            }
        }

        return null;
    }

    moveBall(targetPos) {
        if (!this.state.selectedBall) {
            return { success: false };
        }

        this.moveHistory.push(JSON.parse(JSON.stringify(this.state)));
        if (this.moveHistory.length > 3) {
            this.moveHistory.shift();
        }

        const path = this.findPath(this.state.selectedBall, targetPos);
        if (!path) {
            return { success: false };
        }

        const color = this.state.board[this.state.selectedBall.row][this.state.selectedBall.col];
        this.state.board[this.state.selectedBall.row][this.state.selectedBall.col] = CellColor.EMPTY;
        this.state.board[targetPos.row][targetPos.col] = color;

        const lines = this.checkLines(targetPos);

        if (lines.length > 0) {
            const eliminated = this.eliminateBalls(lines);
            this.state.score += this.calculateScore(eliminated.length);

            this.state.selectedBall = null;

            if (this.checkGameOver()) {
                this.state.gameOver = true;
            }

            return {
                success: true,
                eliminated,
                score: this.state.score
            };
        } else {
            const newBalls = this.spawnBalls();

            this.state.selectedBall = null;

            if (this.checkGameOver()) {
                this.state.gameOver = true;
            }

            return {
                success: true,
                newBalls,
                score: this.state.score
            };
        }
    }

    checkLines(pos) {
        const color = this.state.board[pos.row][pos.col];
        if (color === CellColor.EMPTY) return [];

        const lines = [];

        const dirPairs = [
            [[-1, 0], [1, 0]],
            [[0, -1], [0, 1]],
            [[-1, -1], [1, 1]],
            [[-1, 1], [1, -1]]
        ];

        for (const [dir1, dir2] of dirPairs) {
            const line = [{ ...pos }];

            let r = pos.row + dir1[0];
            let c = pos.col + dir1[1];
            while (
                r >= 0 && r < BOARD_SIZE &&
                c >= 0 && c < BOARD_SIZE &&
                this.state.board[r][c] === color
            ) {
                line.push({ row: r, col: c });
                r += dir1[0];
                c += dir1[1];
            }

            r = pos.row + dir2[0];
            c = pos.col + dir2[1];
            while (
                r >= 0 && r < BOARD_SIZE &&
                c >= 0 && c < BOARD_SIZE &&
                this.state.board[r][c] === color
            ) {
                line.push({ row: r, col: c });
                r += dir2[0];
                c += dir2[1];
            }

            if (line.length >= MATCH_LENGTH) {
                lines.push(line);
            }
        }

        return lines;
    }

    eliminateBalls(lines) {
        const eliminated = new Set();

        for (const line of lines) {
            for (const pos of line) {
                eliminated.add(`${pos.row},${pos.col}`);
            }
        }

        const result = [];
        for (const key of eliminated) {
            const [row, col] = key.split(',').map(Number);
            this.state.board[row][col] = CellColor.EMPTY;
            result.push({ row, col });
        }

        return result;
    }

    calculateScore(count) {
        const baseScore = count * 10;
        let multiplier = 1;

        if (count === 6) multiplier = 1.2;
        else if (count === 7) multiplier = 1.5;
        else if (count >= 8) multiplier = 2;

        return Math.floor(baseScore * multiplier);
    }

    spawnBalls() {
        const newBalls = [];
        const emptyCells = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.state.board[row][col] === CellColor.EMPTY) {
                    emptyCells.push({ row, col });
                }
            }
        }

        for (let i = 0; i < BALLS_PER_TURN && emptyCells.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * emptyCells.length);
            const pos = emptyCells.splice(randomIndex, 1)[0];
            const color = this.state.nextBalls.shift() || this.generateRandomBalls(1)[0];

            this.state.board[pos.row][pos.col] = color;
            newBalls.push(pos);
        }

        while (this.state.nextBalls.length < BALLS_PER_TURN) {
            this.state.nextBalls.push(this.generateRandomBalls(1)[0]);
        }

        return newBalls;
    }

    checkGameOver() {
        const emptyCells = [];
        const balls = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.state.board[row][col] === CellColor.EMPTY) {
                    emptyCells.push({ row, col });
                } else {
                    balls.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) return true;

        for (const ball of balls) {
            for (const empty of emptyCells) {
                if (this.findPath(ball, empty) !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    undo() {
        if (this.moveHistory.length === 0) return false;
        this.state = this.moveHistory.pop();
        return true;
    }

    getHint() {
        const balls = [];
        const emptyCells = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.state.board[row][col] === CellColor.EMPTY) {
                    emptyCells.push({ row, col });
                } else {
                    balls.push({ row, col });
                }
            }
        }

        for (const ball of balls) {
            for (const empty of emptyCells) {
                if (this.findPath(ball, empty) !== null) {
                    return { from: ball, to: empty };
                }
            }
        }

        return null;
    }
}

// ==================== 小马渲染器 ====================
class HorseRenderer {
    constructor(canvasId, game) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.game = game;
        this.cellSize = 0;
        this.padding = 20;
        
        // 动画状态
        this.selectedHorse = null;
        this.animations = new Map();
        this.particles = [];
        
        // 移动动画
        this.movingHorse = null; // { from, to, path, progress, color, onComplete }
        this.pathDots = []; // 路径点动画
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // 启动动画循环
        this.startAnimationLoop();
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const size = Math.min(container.clientWidth, container.clientHeight);
        const minCellSize = 60;
        const maxBoardSize = Math.min(size - this.padding * 2, 650);

        this.canvas.width = maxBoardSize;
        this.canvas.height = maxBoardSize;
        this.cellSize = maxBoardSize / BOARD_SIZE;

        if (this.cellSize < minCellSize) {
            this.cellSize = minCellSize;
            this.canvas.width = this.cellSize * BOARD_SIZE;
            this.canvas.height = this.cellSize * BOARD_SIZE;
        }

        this.render();
    }

    getCellFromPoint(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;

        const col = Math.floor(canvasX / this.cellSize);
        const row = Math.floor(canvasY / this.cellSize);

        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            return { row, col };
        }
        return null;
    }

    startAnimationLoop() {
        const loop = () => {
            this.updateAnimations();
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updateAnimations() {
        const now = Date.now();
        
        // 更新选中动画
        if (this.selectedHorse) {
            const anim = this.animations.get(`${this.selectedHorse.row},${this.selectedHorse.col}`);
            if (anim) {
                const elapsed = now - anim.startTime;
                anim.bounce = Math.sin(elapsed / 150) * 0.1;
            }
        }

        // 更新移动动画
        if (this.movingHorse) {
            const elapsed = now - this.movingHorse.startTime;
            const duration = 300; // 移动动画时长 300ms
            this.movingHorse.progress = Math.min(elapsed / duration, 1);
            
            // 使用 ease-out 缓动
            const t = this.movingHorse.progress;
            this.movingHorse.easedProgress = 1 - Math.pow(1 - t, 3);
            
            if (this.movingHorse.progress >= 1) {
                // 动画完成
                const callback = this.movingHorse.onComplete;
                this.movingHorse = null;
                if (callback) callback();
            }
        }
        
        // 更新路径点动画
        this.pathDots = this.pathDots.filter(dot => {
            dot.life -= 0.05;
            return dot.life > 0;
        });

        // 更新粒子
        this.particles = this.particles.filter(p => {
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            return p.life > 0;
        });
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.drawGrid();
        this.drawPathDots();
        this.drawHorses();
        this.drawMovingHorse();
        this.drawParticles();
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#2d3436');
        gradient.addColorStop(0.5, '#3d3d3d');
        gradient.addColorStop(1, '#2d3436');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= BOARD_SIZE; i++) {
            const pos = i * this.cellSize;

            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();
        }
    }

    drawHorses() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                // 如果这匹马正在移动，不绘制静止的它
                if (this.movingHorse && this.movingHorse.from.row === row && this.movingHorse.from.col === col) {
                    continue;
                }
                
                const color = this.game.state.board[row][col];
                if (color !== CellColor.EMPTY) {
                    this.drawHorse(row, col, color);
                }
            }
        }
    }

    drawHorse(row, col, color) {
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;
        
        const key = `${row},${col}`;
        let anim = this.animations.get(key);
        if (!anim) {
            anim = { startTime: Date.now(), bounce: 0, scale: 1 };
            this.animations.set(key, anim);
        }

        if (this.selectedHorse && this.selectedHorse.row === row && this.selectedHorse.col === col) {
            this.ctx.shadowColor = COLOR_PALETTE[color];
            this.ctx.shadowBlur = 30;
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.save();
        
        const bounceY = anim.bounce * size;
        this.ctx.translate(x, y + bounceY);
        this.ctx.scale(anim.scale, anim.scale);

        switch(color) {
            case CellColor.RED:
                this.drawRedHorse(size);
                break;
            case CellColor.BLUE:
                this.drawBlueHorse(size);
                break;
            case CellColor.GREEN:
                this.drawGreenHorse(size);
                break;
            case CellColor.YELLOW:
                this.drawYellowHorse(size);
                break;
            case CellColor.PURPLE:
                this.drawPurpleHorse(size);
                break;
            case CellColor.ORANGE:
                this.drawOrangeHorse(size);
                break;
            case CellColor.CYAN:
                this.drawCyanHorse(size);
                break;
        }

        this.ctx.restore();
        this.ctx.shadowBlur = 0;
    }

    drawRedHorse(size) {
        const bodyColor = '#c0392b';
        const maneColor = '#e74c3c';
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = maneColor;
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i - 2) * 0.3;
            const flameSize = size * (0.4 + Math.sin(Date.now() / 200 + i) * 0.1);
            this.ctx.beginPath();
            this.ctx.ellipse(
                Math.cos(angle) * size * 0.7,
                Math.sin(angle) * size * 0.5 - size * 0.3,
                flameSize * 0.3,
                flameSize * 0.6,
                angle,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        this.drawEyes(size, '#fff');
    }

    drawBlueHorse(size) {
        const bodyColor = '#2980b9';
        const maneColor = '#3498db';
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = maneColor;
        this.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const x = -size * 0.3 + i * size * 0.3;
            const y = -size * 0.6;
            this.ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
        }
        this.ctx.fill();
        
        this.drawEyes(size, '#fff');
    }

    drawGreenHorse(size) {
        const bodyColor = '#27ae60';
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < 3; i++) {
            const angle = -Math.PI / 3 + i * Math.PI / 6;
            this.ctx.save();
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.ellipse(0, -size * 0.8, size * 0.15, size * 0.4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        this.drawEyes(size, '#fff');
    }

    drawYellowHorse(size) {
        const bodyColor = '#f39c12';
        const shineColor = '#f1c40f';
        
        this.ctx.shadowColor = shineColor;
        this.ctx.shadowBlur = 20;
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = shineColor;
        this.ctx.beginPath();
        this.ctx.arc(0, -size * 0.5, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        this.drawEyes(size, '#fff');
    }

    drawPurpleHorse(size) {
        const bodyColor = '#8e44ad';
        
        this.ctx.strokeStyle = '#9b59b6';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.2, Date.now() / 500, Date.now() / 500 + Math.PI * 1.5);
        this.ctx.stroke();
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = '#bb8fce';
        for (let i = 0; i < 6; i++) {
            const angle = (Date.now() / 1000 + i / 6) * Math.PI * 2;
            const r = size * 0.6;
            this.ctx.beginPath();
            this.ctx.arc(
                Math.cos(angle) * r * 0.5,
                -size * 0.5 + Math.sin(angle) * r * 0.3,
                size * 0.1,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        this.drawEyes(size, '#fff');
    }

    drawOrangeHorse(size) {
        const bodyColor = '#e67e22';
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = '#f39c12';
        for (let i = 0; i < 4; i++) {
            const t = Date.now() / 300 + i;
            const x = size * 0.6 + Math.sin(t) * size * 0.2;
            const y = Math.cos(t * 1.3) * size * 0.3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.drawEyes(size, '#fff');
    }

    drawCyanHorse(size) {
        const bodyColor = '#1abc9c';
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const radius = size * (0.8 + i * 0.3 + Math.sin(Date.now() / 800 + i) * 0.1);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.drawHorseBody(size, bodyColor);
        
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.beginPath();
        this.ctx.arc(0, -size * 0.5, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.drawEyes(size, '#2c3e50');
    }

    drawHorseBody(size, color) {
        const gradient = this.ctx.createRadialGradient(
            -size * 0.2, -size * 0.2, 0,
            0, 0, size
        );
        gradient.addColorStop(0, this.lightenColor(color, 30));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, this.darkenColor(color, 20));
        
        this.ctx.fillStyle = gradient;
        
        this.ctx.beginPath();
        this.ctx.ellipse(0, -size * 0.1, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.3, -size * 0.5);
        this.ctx.lineTo(-size * 0.4, -size * 0.8);
        this.ctx.lineTo(-size * 0.1, -size * 0.6);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(size * 0.3, -size * 0.5);
        this.ctx.lineTo(size * 0.4, -size * 0.8);
        this.ctx.lineTo(size * 0.1, -size * 0.6);
        this.ctx.fill();
        
        this.ctx.fillStyle = this.darkenColor(color, 30);
        this.ctx.beginPath();
        this.ctx.ellipse(0, size * 0.4, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawEyes(size, eyeColor) {
        this.ctx.fillStyle = eyeColor;
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        this.ctx.arc(size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.15, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        this.ctx.arc(size * 0.25, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        this.ctx.fill();
    }

    createEliminationParticles(positions) {
        for (const pos of positions) {
            const x = pos.col * this.cellSize + this.cellSize / 2;
            const y = pos.row * this.cellSize + this.cellSize / 2;
            const color = COLOR_PALETTE[this.game.state.board[pos.row][pos.col]] || '#fff';
            
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const speed = 3 + Math.random() * 2;
                this.particles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    color,
                    size: 4 + Math.random() * 4
                });
            }
        }
    }

    createSpawnParticles(positions, color) {
        for (const pos of positions) {
            const x = pos.col * this.cellSize + this.cellSize / 2;
            const y = pos.row * this.cellSize + this.cellSize / 2;
            
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * this.cellSize * 0.5,
                    y: y - this.cellSize * 0.3,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3,
                    life: 0.8,
                    color: COLOR_PALETTE[color],
                    size: 3 + Math.random() * 3
                });
            }
        }
    }

    drawParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    selectHorse(pos) {
        this.selectedHorse = pos;
        const key = `${pos.row},${pos.col}`;
        this.animations.set(key, {
            startTime: Date.now(),
            bounce: 0,
            scale: 1
        });
    }

    deselectHorse() {
        this.selectedHorse = null;
    }

    // ==================== 移动动画 ====================
    animateMove(from, to, path, color, onComplete) {
        // 创建路径点动画
        this.pathDots = [];
        for (let i = 0; i < path.length; i++) {
            const pos = path[i];
            this.pathDots.push({
                row: pos.row,
                col: pos.col,
                life: 1 - (i / path.length) * 0.5,
                delay: Date.now() + i * 30
            });
        }
        
        // 设置移动动画
        this.movingHorse = {
            from,
            to,
            path,
            color,
            startTime: Date.now(),
            progress: 0,
            easedProgress: 0,
            onComplete
        };
    }

    drawPathDots() {
        const now = Date.now();
        for (const dot of this.pathDots) {
            if (now < dot.delay) continue;
            
            const x = dot.col * this.cellSize + this.cellSize / 2;
            const y = dot.row * this.cellSize + this.cellSize / 2;
            
            this.ctx.globalAlpha = dot.life * 0.6;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize * 0.15 * dot.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    drawMovingHorse() {
        if (!this.movingHorse) return;
        
        const { from, to, path, color, easedProgress } = this.movingHorse;
        
        // 计算当前位置
        const pathIndex = Math.floor(easedProgress * (path.length - 1));
        const nextIndex = Math.min(pathIndex + 1, path.length - 1);
        const segmentProgress = (easedProgress * (path.length - 1)) - pathIndex;
        
        const currentPos = path[pathIndex];
        const nextPos = path[nextIndex];
        
        const x = (currentPos.col + (nextPos.col - currentPos.col) * segmentProgress) * this.cellSize + this.cellSize / 2;
        const y = (currentPos.row + (nextPos.row - currentPos.row) * segmentProgress) * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;
        
        // 绘制移动中的马
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // 跳跃效果
        const jumpHeight = Math.sin(segmentProgress * Math.PI) * size * 0.3;
        this.ctx.translate(0, -jumpHeight);
        
        // 根据方向翻转
        if (nextPos.col < currentPos.col) {
            this.ctx.scale(-1, 1);
        }
        
        // 绘制马
        switch(color) {
            case CellColor.RED:
                this.drawRedHorse(size);
                break;
            case CellColor.BLUE:
                this.drawBlueHorse(size);
                break;
            case CellColor.GREEN:
                this.drawGreenHorse(size);
                break;
            case CellColor.YELLOW:
                this.drawYellowHorse(size);
                break;
            case CellColor.PURPLE:
                this.drawPurpleHorse(size);
                break;
            case CellColor.ORANGE:
                this.drawOrangeHorse(size);
                break;
            case CellColor.CYAN:
                this.drawCyanHorse(size);
                break;
        }
        
        this.ctx.restore();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }
}

// ==================== 游戏控制器 ====================
class GameController {
    constructor() {
        this.game = new LinesGame();
        this.renderer = new HorseRenderer('game-canvas', this.game);

        this.initEventListeners();
        this.updateUI();
        this.updateNextBalls();
    }

    initEventListeners() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInput(touch.clientX, touch.clientY);
        }, { passive: false });

        canvas.addEventListener('mousedown', (e) => {
            this.handleInput(e.clientX, e.clientY);
        });

        document.getElementById('btn-new-game')?.addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.hideGameOver();
            this.newGame();
        });

        document.getElementById('btn-undo')?.addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('btn-hint')?.addEventListener('click', () => {
            this.showHint();
        });
    }

    handleInput(clientX, clientY) {
        if (this.game.state.gameOver) return;
        
        // 如果正在移动动画中，忽略点击
        if (this.renderer.movingHorse) return;

        const cell = this.renderer.getCellFromPoint(clientX, clientY);
        if (!cell) return;

        const { row, col } = cell;
        const cellColor = this.game.state.board[row][col];

        if (cellColor !== CellColor.EMPTY) {
            if (this.game.selectBall(cell)) {
                this.renderer.selectHorse(cell);
                this.updateUI();
            }
            return;
        }

        if (this.game.state.selectedBall) {
            // 先获取路径
            const path = this.game.findPath(this.game.state.selectedBall, cell);
            if (!path) return;
            
            // 保存必要信息
            const from = this.game.state.selectedBall;
            const to = cell;
            const color = this.game.state.board[from.row][from.col];
            
            // 保存历史
            this.game.moveHistory.push(JSON.parse(JSON.stringify(this.game.state)));
            if (this.game.moveHistory.length > 3) {
                this.game.moveHistory.shift();
            }
            
            // 执行移动动画
            this.renderer.animateMove(from, to, path, color, () => {
                // 动画完成后执行逻辑
                const result = this.completeMove(to);
                
                if (result.eliminated) {
                    this.renderer.createEliminationParticles(result.eliminated);
                }
                if (result.newBalls) {
                    this.renderer.createSpawnParticles(result.newBalls);
                }
                
                this.updateUI();
                this.updateNextBalls();
                
                if (this.game.state.gameOver) {
                    this.showGameOver();
                }
            });
            
            // 立即更新棋盘（动画会覆盖显示）
            this.game.state.board[from.row][from.col] = CellColor.EMPTY;
            this.game.state.board[to.row][to.col] = color;
            this.game.state.selectedBall = null;
            this.renderer.deselectHorse();
        }
    }
    
    // 完成移动后的逻辑
    completeMove(targetPos) {
        const lines = this.game.checkLines(targetPos);
        
        if (lines.length > 0) {
            const eliminated = this.game.eliminateBalls(lines);
            this.game.state.score += this.game.calculateScore(eliminated.length);
            
            if (this.game.checkGameOver()) {
                this.game.state.gameOver = true;
            }
            
            return {
                eliminated,
                score: this.game.state.score
            };
        } else {
            const newBalls = this.game.spawnBalls();
            
            if (this.game.checkGameOver()) {
                this.game.state.gameOver = true;
            }
            
            return {
                newBalls,
                score: this.game.state.score
            };
        }
    }

    newGame() {
        this.game.initGame();
        this.renderer.deselectHorse();
        this.renderer.particles = [];
        this.updateUI();
        this.updateNextBalls();
    }

    undo() {
        if (this.game.undo()) {
            this.renderer.deselectHorse();
            this.updateUI();
            this.updateNextBalls();
        }
    }

    showHint() {
        const hint = this.game.getHint();
        if (hint) {
            console.log('提示:', hint);
        }
    }

    updateUI() {
        const scoreEl = document.getElementById('score');
        const highScoreEl = document.getElementById('high-score');
        const undoBtn = document.getElementById('btn-undo');

        if (scoreEl) scoreEl.textContent = this.game.state.score.toString();

        const highScore = parseInt(localStorage.getItem('lines-high-score') || '0');
        if (this.game.state.score > highScore) {
            localStorage.setItem('lines-high-score', this.game.state.score.toString());
        }
        if (highScoreEl) highScoreEl.textContent = Math.max(highScore, this.game.state.score).toString();

        if (undoBtn) undoBtn.disabled = this.game.moveHistory.length === 0;
    }

    updateNextBalls() {
        const container = document.getElementById('next-balls');
        if (!container) return;

        container.innerHTML = '';
        for (const color of this.game.state.nextBalls) {
            const slot = document.createElement('div');
            slot.className = 'preview-slot';
            slot.style.backgroundColor = COLOR_PALETTE[color];
            slot.style.border = 'none';
            slot.style.boxShadow = `0 2px 8px ${COLOR_PALETTE[color]}40`;
            slot.title = HORSE_NAMES[color];
            container.appendChild(slot);
        }
    }

    showGameOver() {
        const modal = document.getElementById('game-over-modal');
        const finalScoreEl = document.getElementById('final-score');

        if (finalScoreEl) finalScoreEl.textContent = this.game.state.score.toString();
        if (modal) modal.classList.remove('hidden');
    }

    hideGameOver() {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.classList.add('hidden');
    }
}

// ==================== 启动游戏 ====================
window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
