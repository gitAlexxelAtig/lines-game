/**
 * 五子连珠 - 核心游戏逻辑 v1.7.1
 * Lines Game Core Logic
 */

// ==================== 类型定义 ====================

enum CellColor {
    EMPTY = 0,
    RED = 1,      // 鲜红
    BLUE = 2,     // 深蓝
    GREEN = 3,    // 翠绿
    YELLOW = 4,   // 明黄
    PURPLE = 5,   // 紫罗兰
    ORANGE = 6,   // 橙红（区别于黄色）
    CYAN = 7,     // 青色
    WHITE = 8     // 万能白色球
}

interface Position {
    row: number;
    col: number;
}

interface GameState {
    board: CellColor[][];
    score: number;
    nextBalls: CellColor[];
    selectedBall: Position | null;
    gameOver: boolean;
}

interface MoveResult {
    success: boolean;
    eliminated?: Position[];
    newBalls?: Position[];
    score?: number;
}

// ==================== 常量 ====================

const BOARD_SIZE = 9;
const INITIAL_BALLS = 5;
const BALLS_PER_TURN = 3;
const MATCH_LENGTH = 5;

// 优化的颜色调色板 - 确保每种颜色都有明显区分
const COLOR_PALETTE: Record<CellColor, string> = {
    [CellColor.EMPTY]: 'transparent',
    [CellColor.RED]: '#e63946',      // 鲜红 - 偏冷红
    [CellColor.BLUE]: '#1d3557',     // 深蓝 - 海军蓝
    [CellColor.GREEN]: '#2a9d8f',    // 翠绿 - 偏青绿
    [CellColor.YELLOW]: '#e9c46a',   // 明黄 - 暖黄（与橙红区分明显）
    [CellColor.PURPLE]: '#9b5de5',   // 紫罗兰 - 亮紫
    [CellColor.ORANGE]: '#f4a261',   // 橙红 - 偏红的橙色（与黄色区分）
    [CellColor.CYAN]: '#00b4d8',     // 青色 - 天蓝
    [CellColor.WHITE]: '#ffffff'     // 纯白色 - 万能球
};

// 颜色名称
const COLOR_NAMES: string[] = [
    'transparent',
    '#e63946',  // Red
    '#1d3557',  // Blue
    '#2a9d8f',  // Green
    '#e9c46a',  // Yellow
    '#9b5de5',  // Purple
    '#f4a261',  // Orange
    '#00b4d8',  // Cyan
    '#ffffff'   // White (万能)
];

// 难度配置
const DIFFICULTY_CONFIG = {
    easy: { colors: 5, whiteBallChance: 0.05 },    // 5色，5%白球
    medium: { colors: 6, whiteBallChance: 0.03 },  // 6色，3%白球
    hard: { colors: 7, whiteBallChance: 0.01 }     // 7色，1%白球
};

let currentDifficulty: keyof typeof DIFFICULTY_CONFIG = 'easy';

// ==================== 游戏逻辑类 ====================

class LinesGame {
    state: GameState;
    private moveHistory: GameState[] = [];

    constructor() {
        this.state = this.createInitialState();
    }

    private createInitialState(): GameState {
        const board: CellColor[][] = Array(BOARD_SIZE)
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

    /**
     * 设置难度
     */
    setDifficulty(difficulty: keyof typeof DIFFICULTY_CONFIG): void {
        currentDifficulty = difficulty;
    }

    /**
     * 获取当前难度
     */
    getDifficulty(): keyof typeof DIFFICULTY_CONFIG {
        return currentDifficulty;
    }

    /**
     * 初始化新游戏
     */
    initGame(): void {
        this.state = this.createInitialState();
        this.moveHistory = [];

        // 放置初始球
        for (const color of this.generateRandomBalls(INITIAL_BALLS)) {
            const pos = this.getRandomEmptyCell();
            if (pos) {
                this.state.board[pos.row][pos.col] = color;
            }
        }
    }

    /**
     * 生成随机颜色数组 - 包含万能白球概率
     */
    private generateRandomBalls(count: number): CellColor[] {
        const balls: CellColor[] = [];
        const config = DIFFICULTY_CONFIG[currentDifficulty];
        
        for (let i = 0; i < count; i++) {
            // 按概率生成万能白球
            if (Math.random() < config.whiteBallChance) {
                balls.push(CellColor.WHITE);
            } else {
                // 在配置的颜色范围内随机
                balls.push(Math.floor(Math.random() * config.colors) + 1 as CellColor);
            }
        }
        return balls;
    }

    /**
     * 获取随机空格子
     */
    private getRandomEmptyCell(): Position | null {
        const emptyCells: Position[] = [];
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

    /**
     * 选择小球
     */
    selectBall(pos: Position): boolean {
        if (this.state.gameOver) return false;
        if (this.state.board[pos.row][pos.col] === CellColor.EMPTY) return false;

        this.state.selectedBall = pos;
        return true;
    }

    /**
     * BFS路径查找
     */
    findPath(start: Position, end: Position): Position[] | null {
        if (this.state.board[end.row][end.col] !== CellColor.EMPTY) {
            return null;
        }

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const queue: Position[] = [start];
        const visited = new Set<string>();
        const parent = new Map<string, Position>();

        visited.add(`${start.row},${start.col}`);

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.row === end.row && current.col === end.col) {
                // 重建路径
                const path: Position[] = [];
                let curr: Position | undefined = end;
                while (curr) {
                    path.unshift(curr);
                    curr = parent.get(`${curr.row},${curr.col}`);
                }
                return path;
            }

            for (const [dr, dc] of directions) {
                const newRow = current.row + dr;
                const newCol = current.col + dc;

                // 边界检查
                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) continue;

                // 障碍物检查
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

    /**
     * 移动小球
     */
    moveBall(targetPos: Position): MoveResult {
        if (!this.state.selectedBall) {
            return { success: false };
        }

        // 保存历史状态（用于撤销）
        this.moveHistory.push(JSON.parse(JSON.stringify(this.state)));
        if (this.moveHistory.length > 3) {
            this.moveHistory.shift();
        }

        const path = this.findPath(this.state.selectedBall, targetPos);
        if (!path) {
            return { success: false };
        }

        // 执行移动
        const color = this.state.board[this.state.selectedBall.row][this.state.selectedBall.col];
        this.state.board[this.state.selectedBall.row][this.state.selectedBall.col] = CellColor.EMPTY;
        this.state.board[targetPos.row][targetPos.col] = color;

        // 检测连珠（包含万能白球逻辑）
        const lines = this.checkLines(targetPos);

        if (lines.length > 0) {
            // 有消除
            const eliminated = this.eliminateBalls(lines);
            this.state.score += this.calculateScore(eliminated.length);

            this.state.selectedBall = null;

            // 检查游戏结束（消除后不移除球，继续游戏）
            if (this.checkGameOver()) {
                this.state.gameOver = true;
            }

            return {
                success: true,
                eliminated,
                score: this.state.score
            };
        } else {
            // 无消除，生成新球
            const newBalls = this.spawnBalls();

            this.state.selectedBall = null;

            // 检查游戏结束
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

    /**
     * 检测连珠 - 包含万能白球逻辑
     * 
     * 万能白球规则：
     * 1. 白球可以与任何颜色匹配消除
     * 2. 如果白球旁边有白球，它们也可以相互匹配
     * 3. 检测时统计周围最多的颜色，白球可以作为该颜色的一部分
     */
    private checkLines(pos: Position): Position[][] {
        const color = this.state.board[pos.row][pos.col];
        if (color === CellColor.EMPTY) return [];

        const lines: Position[][] = [];

        // 4组方向对
        const dirPairs = [
            [[-1, 0], [1, 0]],    // 竖直
            [[0, -1], [0, 1]],    // 水平
            [[-1, -1], [1, 1]],   // 主对角线
            [[-1, 1], [1, -1]]    // 副对角线
        ];

        for (const [dir1, dir2] of dirPairs) {
            const line: Position[] = [{ ...pos }];
            const colorsInLine: CellColor[] = [color];

            // 向dir1方向扫描
            let r = pos.row + dir1[0];
            let c = pos.col + dir1[1];
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const cellColor = this.state.board[r][c];
                if (cellColor === CellColor.EMPTY) break;
                
                // 如果是白球，或者与起点颜色匹配，或者是白球起点
                if (this.canMatch(color, cellColor)) {
                    line.push({ row: r, col: c });
                    colorsInLine.push(cellColor);
                    r += dir1[0];
                    c += dir1[1];
                } else {
                    break;
                }
            }

            // 向dir2方向扫描
            r = pos.row + dir2[0];
            c = pos.col + dir2[1];
            while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                const cellColor = this.state.board[r][c];
                if (cellColor === CellColor.EMPTY) break;
                
                if (this.canMatch(color, cellColor)) {
                    line.push({ row: r, col: c });
                    colorsInLine.push(cellColor);
                    r += dir2[0];
                    c += dir2[1];
                } else {
                    break;
                }
            }

            // 检查是否形成有效连线
            if (line.length >= MATCH_LENGTH) {
                // 统计颜色数量，确保有有效匹配
                const nonWhiteColors = colorsInLine.filter(c => c !== CellColor.WHITE);
                const hasNonWhite = nonWhiteColors.length > 0;
                
                // 如果全是白球，也可以消除（白球之间可以相互匹配）
                if (hasNonWhite || colorsInLine.every(c => c === CellColor.WHITE)) {
                    lines.push(line);
                }
            }
        }

        return lines;
    }

    /**
     * 判断两个颜色是否可以匹配
     * 白球可以与任何颜色匹配，白球之间也可以相互匹配
     */
    private canMatch(color1: CellColor, color2: CellColor): boolean {
        // 如果都是白球，可以匹配
        if (color1 === CellColor.WHITE && color2 === CellColor.WHITE) return true;
        // 如果其中一个是白球，可以匹配
        if (color1 === CellColor.WHITE || color2 === CellColor.WHITE) return true;
        // 否则必须颜色相同
        return color1 === color2;
    }

    /**
     * 消除小球
     */
    private eliminateBalls(lines: Position[][]): Position[] {
        const eliminated = new Set<string>();

        for (const line of lines) {
            for (const pos of line) {
                eliminated.add(`${pos.row},${pos.col}`);
            }
        }

        const result: Position[] = [];
        for (const key of eliminated) {
            const [row, col] = key.split(',').map(Number);
            this.state.board[row][col] = CellColor.EMPTY;
            result.push({ row, col });
        }

        return result;
    }

    /**
     * 计算得分
     */
    private calculateScore(count: number): number {
        const baseScore = count * 10;
        let multiplier = 1;

        if (count === 6) multiplier = 1.2;
        else if (count === 7) multiplier = 1.5;
        else if (count >= 8) multiplier = 2;

        return Math.floor(baseScore * multiplier);
    }

    /**
     * 生成新球
     */
    private spawnBalls(): Position[] {
        const newBalls: Position[] = [];
        const emptyCells: Position[] = [];

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

        // 补充nextBalls
        while (this.state.nextBalls.length < BALLS_PER_TURN) {
            this.state.nextBalls.push(this.generateRandomBalls(1)[0]);
        }

        return newBalls;
    }

    /**
     * 检查游戏结束
     */
    private checkGameOver(): boolean {
        const emptyCells: Position[] = [];
        const balls: Position[] = [];

        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.state.board[row][col] === CellColor.EMPTY) {
                    emptyCells.push({ row, col });
                } else {
                    balls.push({ row, col });
                }
            }
        }

        // 没有空格子
        if (emptyCells.length === 0) return true;

        // 检查是否有球可以移动
        for (const ball of balls) {
            for (const empty of emptyCells) {
                if (this.findPath(ball, empty) !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 撤销上一步
     */
    undo(): boolean {
        if (this.moveHistory.length === 0) return false;
        this.state = this.moveHistory.pop()!;
        return true;
    }

    /**
     * 获取提示
     */
    getHint(): { from: Position; to: Position } | null {
        const balls: Position[] = [];
        const emptyCells: Position[] = [];

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

// ==================== 游戏渲染器 ====================

class GameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private game: LinesGame;
    private cellSize: number = 0;
    private padding: number = 20;

    // 动画状态
    private animatingBalls: Map<string, { x: number; y: number; scale: number }> = new Map();
    private selectedBallAnim = { scale: 1 };
    private eliminationAnim: Position[] | null = null;
    private newBallsAnim: Position[] | null = null;

    constructor(canvasId: string, game: LinesGame) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.game = game;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 调整画布大小
     */
    resize(): void {
        const container = this.canvas.parentElement!;
        const size = Math.min(container.clientWidth, container.clientHeight);

        // 平板适配：确保触控区域足够大
        const minCellSize = 50; // 最小格子大小（触控友好）
        const maxBoardSize = Math.min(size - this.padding * 2, 600);

        this.canvas.width = maxBoardSize;
        this.canvas.height = maxBoardSize;
        this.cellSize = maxBoardSize / BOARD_SIZE;

        // 如果格子太小，调整画布大小
        if (this.cellSize < minCellSize) {
            this.cellSize = minCellSize;
            this.canvas.width = this.cellSize * BOARD_SIZE;
            this.canvas.height = this.cellSize * BOARD_SIZE;
        }

        this.render();
    }

    /**
     * 获取格子坐标
     */
    getCellFromPoint(x: number, y: number): Position | null {
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

    /**
     * 渲染游戏
     */
    render(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid();
        this.drawBalls();
        this.drawSelection();
    }

    /**
     * 绘制棋盘网格
     */
    private drawGrid(): void {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= BOARD_SIZE; i++) {
            const pos = i * this.cellSize;

            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();

            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制小球
     */
    private drawBalls(): void {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const color = this.game.state.board[row][col];
                if (color !== CellColor.EMPTY) {
                    this.drawBall(row, col, color);
                }
            }
        }
    }

    /**
     * 绘制单个小球
     */
    private drawBall(row: number, col: number, color: CellColor, scale: number = 1): void {
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const radius = (this.cellSize * 0.4) * scale;

        // 万能白球特殊绘制 - 带星星闪光效果
        if (color === CellColor.WHITE) {
            this.drawWhiteBall(x, y, radius);
            return;
        }

        // 外发光
        this.ctx.shadowColor = COLOR_PALETTE[color];
        this.ctx.shadowBlur = 10;

        // 球体渐变
        const gradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        gradient.addColorStop(0, this.lightenColor(COLOR_PALETTE[color], 40));
        gradient.addColorStop(0.5, COLOR_PALETTE[color]);
        gradient.addColorStop(1, this.darkenColor(COLOR_PALETTE[color], 30));

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(
            x - radius * 0.3,
            y - radius * 0.3,
            radius * 0.25,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    /**
     * 绘制万能白球 - 带星星效果
     */
    private drawWhiteBall(x: number, y: number, radius: number): void {
        // 白球外发光 - 彩虹色
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 白球主体
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 15;

        const ballGradient = this.ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
        );
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(0.7, '#f0f0f0');
        ballGradient.addColorStop(1, '#d0d0d0');

        this.ctx.fillStyle = ballGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制星星效果
        this.ctx.shadowBlur = 0;
        this.drawStar(x, y, radius * 0.4, 5);

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(
            x - radius * 0.3,
            y - radius * 0.3,
            radius * 0.2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    /**
     * 绘制星星
     */
    private drawStar(x: number, y: number, radius: number, points: number): void {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const r = i % 2 === 0 ? radius : radius * 0.4;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 绘制选中效果
     */
    private drawSelection(): void {
        if (!this.game.state.selectedBall) return;

        const { row, col } = this.game.state.selectedBall;
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * 0.45 * this.selectedBallAnim.scale;

        // 选中环
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 15;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;
    }

    /**
     * 颜色处理辅助函数
     */
    private lightenColor(color: string, percent: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    private darkenColor(color: string, percent: number): string {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * 选中动画
     */
    animateSelection(): void {
        const targetScale = 1.2;
        const duration = 200;
        const startTime = Date.now();
        const startScale = this.selectedBallAnim.scale;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.selectedBallAnim.scale = startScale + (targetScale - startScale) * progress;
            this.render();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * 取消选中动画
     */
    animateDeselect(): void {
        this.selectedBallAnim.scale = 1;
        this.render();
    }
}

// ==================== 游戏控制器 ====================

class GameController {
    private game: LinesGame;
    private renderer: GameRenderer;

    constructor() {
        this.game = new LinesGame();
        this.renderer = new GameRenderer('game-canvas', this.game);

        this.initEventListeners();
        this.updateUI();
    }

    /**
     * 初始化事件监听
     */
    private initEventListeners(): void {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

        // 触摸/点击事件
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInput(touch.clientX, touch.clientY);
        }, { passive: false });

        canvas.addEventListener('mousedown', (e) => {
            this.handleInput(e.clientX, e.clientY);
        });

        // 按钮事件
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

    /**
     * 处理输入
     */
    private handleInput(clientX: number, clientY: number): void {
        if (this.game.state.gameOver) return;

        const cell = this.renderer.getCellFromPoint(clientX, clientY);
        if (!cell) return;

        const { row, col } = cell;
        const cellColor = this.game.state.board[row][col];

        // 如果点击的是已有球，选中它
        if (cellColor !== CellColor.EMPTY) {
            if (this.game.selectBall(cell)) {
                this.renderer.animateSelection();
                this.updateUI();
            }
            return;
        }

        // 如果点击的是空格子且已选中球，尝试移动
        if (this.game.state.selectedBall) {
            const result = this.game.moveBall(cell);

            if (result.success) {
                this.renderer.animateDeselect();
                this.renderer.render();
                this.updateUI();
                this.updateNextBalls();

                if (result.eliminated) {
                    this.showEliminationEffect(result.eliminated);
                }

                if (result.newBalls) {
                    this.showNewBallsEffect(result.newBalls);
                }

                if (this.game.state.gameOver) {
                    this.showGameOver();
                }
            }
        }
    }

    /**
     * 新游戏
     */
    newGame(): void {
        this.game.initGame();
        this.renderer.render();
        this.updateUI();
        this.updateNextBalls();
    }

    /**
     * 撤销
     */
    private undo(): void {
        if (this.game.undo()) {
            this.renderer.render();
            this.updateUI();
            this.updateNextBalls();
        }
    }

    /**
     * 显示提示
     */
    private showHint(): void {
        const hint = this.game.getHint();
        if (hint) {
            console.log('提示:', hint);
        }
    }

    /**
     * 更新UI
     */
    private updateUI(): void {
        const scoreEl = document.getElementById('score');
        const highScoreEl = document.getElementById('high-score');
        const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;

        if (scoreEl) scoreEl.textContent = this.game.state.score.toString();

        // 最高分
        const highScore = parseInt(localStorage.getItem('lines-high-score') || '0');
        if (this.game.state.score > highScore) {
            localStorage.setItem('lines-high-score', this.game.state.score.toString());
        }
        if (highScoreEl) highScoreEl.textContent = Math.max(highScore, this.game.state.score).toString();

        // 撤销按钮状态
        if (undoBtn) undoBtn.disabled = false;
    }

    /**
     * 更新下回合预览
     */
    private updateNextBalls(): void {
        const container = document.getElementById('next-balls');
        if (!container) return;

        container.innerHTML = '';
        for (const color of this.game.state.nextBalls) {
            const slot = document.createElement('div');
            slot.className = 'preview-slot';
            
            // 万能白球在预览中显示为带金色边框的白色
            if (color === CellColor.WHITE) {
                slot.style.background = '#ffffff';
                slot.style.border = '3px solid #ffd700';
                slot.style.boxShadow = '0 0 10px #ffd700, inset 0 0 5px rgba(255, 215, 0, 0.3)';
                
                // 添加星星标记
                const star = document.createElement('span');
                star.textContent = '★';
                star.style.color = '#ffd700';
                star.style.fontSize = '16px';
                star.style.position = 'absolute';
                slot.style.position = 'relative';
                slot.appendChild(star);
            } else {
                slot.style.backgroundColor = COLOR_PALETTE[color];
                slot.style.border = 'none';
                slot.style.boxShadow = `0 2px 8px ${COLOR_PALETTE[color]}40`;
            }
            
            container.appendChild(slot);
        }
    }

    /**
     * 显示消除效果
     */
    private showEliminationEffect(positions: Position[]): void {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        const originalOpacity = canvas.style.opacity;

        canvas.style.opacity = '0.7';
        setTimeout(() => {
            canvas.style.opacity = originalOpacity || '1';
        }, 100);
    }

    /**
     * 显示新球效果
     */
    private showNewBallsEffect(positions: Position[]): void {
        this.renderer.render();
    }

    /**
     * 显示游戏结束
     */
    private showGameOver(): void {
        const modal = document.getElementById('game-over-modal');
        const finalScoreEl = document.getElementById('final-score');

        if (finalScoreEl) finalScoreEl.textContent = this.game.state.score.toString();
        if (modal) modal.classList.remove('hidden');
    }

    /**
     * 隐藏游戏结束
     */
    private hideGameOver(): void {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.classList.add('hidden');
    }

    /**
     * 设置难度
     */
    setDifficulty(difficulty: keyof typeof DIFFICULTY_CONFIG): void {
        this.game.setDifficulty(difficulty);
    }
}

// ==================== 启动游戏 ====================

window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
