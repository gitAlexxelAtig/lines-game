/**
 * 五子连珠 - 皮肤系统版
 * 支持多皮肤切换、音效系统、设置面板
 */

// ==================== 常量定义 ====================
const CellColor = {
    EMPTY: 0,
    RED: 1,
    BLUE: 2,
    GREEN: 3,
    YELLOW: 4,
    PURPLE: 5,
    ORANGE: 6,
    CYAN: 7
};

const BOARD_SIZE = 9;
const INITIAL_BALLS = 5;
const BALLS_PER_TURN = 3;
const MATCH_LENGTH = 5;

// ==================== 音频系统 ====================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('lines-sound-enabled') !== 'false';
        this.buffers = {};
        this.init();
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('lines-sound-enabled', enabled);
    }

    // 生成音效
    generateTone(freq, duration, type = 'sine') {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - t / duration);
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
        }
        return buffer;
    }

    generateHoofBeat() {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const duration = 0.1;
        const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 20);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
        }
        return buffer;
    }

    generateChord(freqs, duration) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - t / duration);
            let sample = 0;
            for (const f of freqs) {
                sample += Math.sin(2 * Math.PI * f * t) * envelope * 0.15;
            }
            data[i] = sample;
        }
        return buffer;
    }

    // 播放移动音效序列（根据距离）
    playMoveSequence(distance) {
        if (!this.enabled || !this.ctx || this.currentSkin !== 'horse') {
            this.play('move');
            return;
        }
        
        this.resume();
        const steps = Math.min(distance, 8); // 最多8声
        const interval = 80; // 间隔ms
        
        for (let i = 0; i < steps; i++) {
            setTimeout(() => {
                if (!this.enabled) return;
                const source = this.ctx.createBufferSource();
                source.buffer = this.buffers.move;
                // 创建增益节点控制音量衰减
                const gain = this.ctx.createGain();
                gain.gain.value = 1 - (i / steps) * 0.3; // 渐弱
                source.connect(gain);
                gain.connect(this.ctx.destination);
                source.start();
            }, i * interval);
        }
    }

    // 皮肤相关音效
    loadSkinSounds(skinName) {
        this.buffers = {};
        
        if (skinName === 'classic') {
            this.buffers.select = this.generateTone(880, 0.1);
            this.buffers.move = this.generateTone(440, 0.15, 'triangle');
            this.buffers.eliminate = this.generateChord([523.25, 659.25, 783.99], 0.3);
            this.buffers.spawn = this.generateTone(330, 0.1);
        } else if (skinName === 'horse') {
            // 马嘶鸣（锯齿波）
            this.buffers.select = this.generateHorseWhinny(800, 0.3);
            this.buffers.move = this.generateHoofBeat();
            this.buffers.eliminate = this.generateChord([523.25, 659.25, 783.99, 1046.5], 0.5);
            this.buffers.spawn = this.generateHorseWhinny(600, 0.4, true);
        }
    }

    generateHorseWhinny(baseFreq, duration, distant = false) {
        if (!this.ctx) return null;
        const sampleRate = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const freq = baseFreq + Math.sin(t * 10) * 100 + t * 200;
            const envelope = Math.max(0, 1 - t / duration);
            let sample = Math.sin(2 * Math.PI * freq * t) * envelope;
            sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 * envelope;
            sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.1 * envelope;
            
            if (distant) {
                sample *= 0.5;
                if (i > 0) sample = (sample + data[i - 1]) * 0.3;
            }
            data[i] = sample * 0.3;
        }
        return buffer;
    }

    play(type) {
        if (!this.enabled || !this.ctx || !this.buffers[type]) return;
        this.resume();
        
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[type];
        source.connect(this.ctx.destination);
        source.start();
    }
}

// ==================== 游戏逻辑 ====================
class LinesGame {
    constructor() {
        this.state = this.createInitialState();
        this.moveHistory = [];
        this.colorCount = parseInt(localStorage.getItem('lines-difficulty')) || 7;
        this.initGame();
    }

    createInitialState() {
        return {
            board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(CellColor.EMPTY)),
            score: 0,
            nextBalls: this.generateRandomBalls(BALLS_PER_TURN),
            selectedBall: null,
            gameOver: false
        };
    }

    initGame() {
        this.state = this.createInitialState();
        this.moveHistory = [];
        
        for (const color of this.generateRandomBalls(INITIAL_BALLS)) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.state.board[pos.row][pos.col] = color;
        }
    }

    generateRandomBalls(count) {
        const balls = [];
        for (let i = 0; i < count; i++) {
            balls.push(Math.floor(Math.random() * this.colorCount) + 1);
        }
        return balls;
    }

    getRandomEmptyCell() {
        const empty = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.state.board[r][c] === CellColor.EMPTY) empty.push({row: r, col: c});
            }
        }
        return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : null;
    }

    selectBall(pos) {
        if (this.state.gameOver) return false;
        if (this.state.board[pos.row][pos.col] === CellColor.EMPTY) return false;
        this.state.selectedBall = pos;
        return true;
    }

    findPath(start, end) {
        if (this.state.board[end.row][end.col] !== CellColor.EMPTY) return null;
        
        const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
        const queue = [start];
        const visited = new Set([`${start.row},${start.col}`]);
        const parent = new Map();
        
        while (queue.length > 0) {
            const cur = queue.shift();
            if (cur.row === end.row && cur.col === end.col) {
                const path = [];
                let p = end;
                while (p) {
                    path.unshift(p);
                    p = parent.get(`${p.row},${p.col}`);
                }
                return path;
            }
            
            for (const [dr, dc] of dirs) {
                const nr = cur.row + dr, nc = cur.col + dc;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                
                const isTarget = nr === end.row && nc === end.col;
                const isEmpty = this.state.board[nr][nc] === CellColor.EMPTY;
                if (!isTarget && !isEmpty) continue;
                
                const key = `${nr},${nc}`;
                if (visited.has(key)) continue;
                visited.add(key);
                parent.set(key, cur);
                queue.push({row: nr, col: nc});
            }
        }
        return null;
    }

    checkLines(pos) {
        const color = this.state.board[pos.row][pos.col];
        if (color === CellColor.EMPTY) return [];
        
        const lines = [];
        const dirPairs = [[[-1,0],[1,0]], [[0,-1],[0,1]], [[-1,-1],[1,1]], [[-1,1],[1,-1]]];
        
        for (const [d1, d2] of dirPairs) {
            const line = [{...pos}];
            
            let r = pos.row + d1[0], c = pos.col + d1[1];
            while (r >=0 && r<BOARD_SIZE && c>=0 && c<BOARD_SIZE && this.state.board[r][c]===color) {
                line.push({row: r, col: c});
                r += d1[0]; c += d1[1];
            }
            
            r = pos.row + d2[0]; c = pos.col + d2[1];
            while (r >=0 && r<BOARD_SIZE && c>=0 && c<BOARD_SIZE && this.state.board[r][c]===color) {
                line.push({row: r, col: c});
                r += d2[0]; c += d2[1];
            }
            
            if (line.length >= MATCH_LENGTH) lines.push(line);
        }
        return lines;
    }

    eliminateBalls(lines) {
        const eliminated = new Set();
        for (const line of lines) {
            for (const pos of line) eliminated.add(`${pos.row},${pos.col}`);
        }
        
        const result = [];
        for (const key of eliminated) {
            const [row, col] = key.split(',').map(Number);
            this.state.board[row][col] = CellColor.EMPTY;
            result.push({row, col});
        }
        return result;
    }

    spawnBalls() {
        const newBalls = [];
        const empty = [];
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.state.board[r][c] === CellColor.EMPTY) empty.push({row: r, col: c});
            }
        }
        
        for (let i = 0; i < BALLS_PER_TURN && empty.length > 0; i++) {
            const idx = Math.floor(Math.random() * empty.length);
            const pos = empty.splice(idx, 1)[0];
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
        const empty = [], balls = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.state.board[r][c] === CellColor.EMPTY) empty.push({row: r, col: c});
                else balls.push({row: r, col: c});
            }
        }
        
        if (empty.length === 0) return true;
        
        for (const ball of balls) {
            for (const e of empty) {
                if (this.findPath(ball, e)) return false;
            }
        }
        return true;
    }

    undo() {
        if (this.moveHistory.length === 0) return false;
        this.state = this.moveHistory.pop();
        return true;
    }

    setDifficulty(colors) {
        this.colorCount = colors;
        localStorage.setItem('lines-difficulty', colors);
    }
}

// ==================== 渲染器 ====================
class GameRenderer {
    constructor(canvasId, game) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.game = game;
        this.audio = new AudioManager();
        this.cellSize = 0;
        this.padding = 20;
        
        // 皮肤
        this.currentSkin = localStorage.getItem('lines-skin') || 'horse';
        this.audio.loadSkinSounds(this.currentSkin);
        
        // 动画状态
        this.selectedHorse = null;
        this.animations = new Map();
        this.particles = [];
        this.movingHorse = null;
        this.pathDots = [];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.startAnimationLoop();
    }

    setSkin(skinName) {
        this.currentSkin = skinName;
        localStorage.setItem('lines-skin', skinName);
        this.audio.loadSkinSounds(skinName);
    }

    resize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const size = Math.min(container.clientWidth, container.clientHeight);
        const minCell = 60;
        const maxBoard = Math.min(size - this.padding * 2, 650);
        
        this.canvas.width = maxBoard;
        this.canvas.height = maxBoard;
        this.cellSize = maxBoard / BOARD_SIZE;
        
        if (this.cellSize < minCell) {
            this.cellSize = minCell;
            this.canvas.width = this.cellSize * BOARD_SIZE;
            this.canvas.height = this.cellSize * BOARD_SIZE;
        }
        
        this.render();
    }

    getCellFromPoint(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        
        // 方法2：直接用比例计算（不受 DPR 影响）
        // 将点击位置相对于 canvas 的比例，乘以格子数
        const col = Math.floor(((x - rect.left) / rect.width) * BOARD_SIZE);
        const row = Math.floor(((y - rect.top) / rect.height) * BOARD_SIZE);
        
        if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
            return {row, col};
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
        
        if (this.selectedHorse) {
            const anim = this.animations.get(`${this.selectedHorse.row},${this.selectedHorse.col}`);
            if (anim) {
                anim.bounce = Math.sin((now - anim.startTime) / 150) * 0.1;
            }
        }
        
        if (this.movingHorse) {
            const elapsed = now - this.movingHorse.startTime;
            const duration = 300;
            this.movingHorse.progress = Math.min(elapsed / duration, 1);
            this.movingHorse.easedProgress = 1 - Math.pow(1 - this.movingHorse.progress, 3);
            
            if (this.movingHorse.progress >= 1) {
                const cb = this.movingHorse.onComplete;
                this.movingHorse = null;
                if (cb) cb();
            }
        }
        
        this.pathDots = this.pathDots.filter(d => {
            if (now < d.delay) return true;
            d.life -= 0.05;
            return d.life > 0;
        });
        
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
        this.drawPieces();
        this.drawMovingPiece();
        this.drawParticles();
    }

    drawBackground() {
        const colors = this.currentSkin === 'classic' 
            ? ['#1a1a2e', '#16213e', '#0f3460']
            : ['#2d3436', '#3d3d3d', '#2d3436'];
            
        // 基础渐变
        const grad = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        grad.addColorStop(0, colors[0]);
        grad.addColorStop(0.5, colors[1]);
        grad.addColorStop(1, colors[2]);
        
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 木纹纹理效果
        if (this.currentSkin === 'horse') {
            this.ctx.save();
            this.ctx.globalAlpha = 0.03;
            this.ctx.strokeStyle = '#8b4513';
            this.ctx.lineWidth = 2;
            
            for (let i = 0; i < this.canvas.width; i += 20) {
                this.ctx.beginPath();
                this.ctx.moveTo(i, 0);
                // 波浪线模拟木纹
                for (let y = 0; y < this.canvas.height; y += 10) {
                    this.ctx.lineTo(
                        i + Math.sin(y * 0.02 + i * 0.01) * 3,
                        y
                    );
                }
                this.ctx.stroke();
            }
            this.ctx.restore();
            
            // 内阴影效果
            const shadowGrad = this.ctx.createRadialGradient(
                this.canvas.width / 2, this.canvas.height / 2, 0,
                this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
            );
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
            this.ctx.fillStyle = shadowGrad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // 边框
        this.ctx.strokeStyle = this.currentSkin === 'classic' ? '#667eea' : '#d4af37';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        
        // 角落装饰
        if (this.currentSkin === 'horse') {
            this.drawCornerDecorations();
        }
    }

    drawCornerDecorations() {
        const size = 20;
        const color = '#d4af37';
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        
        // 左上角
        this.drawCorner(6, 6, size, 0);
        // 右上角
        this.drawCorner(this.canvas.width - 6, 6, size, Math.PI / 2);
        // 右下角
        this.drawCorner(this.canvas.width - 6, this.canvas.height - 6, size, Math.PI);
        // 左下角
        this.drawCorner(6, this.canvas.height - 6, size, -Math.PI / 2);
    }

    drawCorner(x, y, size, rotation) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawGrid() {
        this.ctx.strokeStyle = this.currentSkin === 'classic' 
            ? 'rgba(255,255,255,0.1)' 
            : 'rgba(212,175,55,0.3)';
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

    drawPathDots() {
        const now = Date.now();
        for (const d of this.pathDots) {
            if (now < d.delay) continue;
            const x = d.col * this.cellSize + this.cellSize / 2;
            const y = d.row * this.cellSize + this.cellSize / 2;
            
            this.ctx.globalAlpha = d.life * 0.6;
            this.ctx.fillStyle = '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.cellSize * 0.15 * d.life, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    drawPieces() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.movingHorse && this.movingHorse.from.row === r && this.movingHorse.from.col === c) continue;
                
                const color = this.game.state.board[r][c];
                if (color !== CellColor.EMPTY) {
                    this.drawPiece(r, c, color);
                }
            }
        }
    }

    drawPiece(row, col, color) {
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;
        
        const key = `${row},${col}`;
        let anim = this.animations.get(key);
        if (!anim) {
            anim = {startTime: Date.now(), bounce: 0, scale: 1};
            this.animations.set(key, anim);
        }
        
        // 选中效果
        if (this.selectedHorse && this.selectedHorse.row === row && this.selectedHorse.col === col) {
            this.drawSelection(x, y, size, color);
        }
        
        this.ctx.save();
        this.ctx.translate(x, y + anim.bounce * size);
        
        if (this.currentSkin === 'classic') {
            this.drawClassicBall(color, size);
        } else {
            this.drawHorse(color, size);
        }
        
        this.ctx.restore();
    }

    drawSelection(x, y, size, color) {
        const palette = ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8e44ad', '#e67e22', '#00d2d3'];
        this.ctx.shadowColor = palette[color - 1];
        this.ctx.shadowBlur = 30;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawClassicBall(color, size) {
        const palette = ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8e44ad', '#e67e22', '#00d2d3'];
        const c = palette[color - 1];
        
        this.ctx.shadowColor = c;
        this.ctx.shadowBlur = 15;
        
        const grad = this.ctx.createRadialGradient(-size * 0.3, -size * 0.3, 0, 0, 0, size);
        grad.addColorStop(0, this.lighten(c, 40));
        grad.addColorStop(0.5, c);
        grad.addColorStop(1, this.darken(c, 30));
        
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawHorse(color, size) {
        const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#e67e22', '#1abc9c'];
        const bodyColor = colors[color - 1];
        
        // 身体
        const grad = this.ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
        grad.addColorStop(0, this.lighten(bodyColor, 30));
        grad.addColorStop(0.5, bodyColor);
        grad.addColorStop(1, this.darken(bodyColor, 20));
        
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.ellipse(0, -size * 0.1, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 耳朵
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
        
        // 嘴
        this.ctx.fillStyle = this.darken(bodyColor, 30);
        this.ctx.beginPath();
        this.ctx.ellipse(0, size * 0.4, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 眼睛
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
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

    drawMovingPiece() {
        if (!this.movingHorse) return;
        
        const {path, color, easedProgress} = this.movingHorse;
        if (path.length <= 1) return;
        
        const idx = Math.floor(easedProgress * (path.length - 1));
        const nextIdx = Math.min(idx + 1, path.length - 1);
        const segProg = (easedProgress * (path.length - 1)) - idx;
        
        const cur = path[idx], next = path[nextIdx];
        const x = (cur.col + (next.col - cur.col) * segProg) * this.cellSize + this.cellSize / 2;
        const y = (cur.row + (next.row - cur.row) * segProg) * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;
        
        this.ctx.save();
        this.ctx.translate(x, y - Math.sin(segProg * Math.PI) * size * 0.3);
        
        if (next.col < cur.col) this.ctx.scale(-1, 1);
        
        if (this.currentSkin === 'classic') {
            this.drawClassicBall(color, size);
        } else {
            this.drawHorse(color, size);
        }
        
        this.ctx.restore();
    }

    drawParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            
            if (p.type === 'sparkle') {
                // 绘制闪光星星
                this.drawStar(p.x, p.y, 4, p.size * p.life, p.size * 0.4 * p.life);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            } else {
                // 普通圆形粒子
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
    }

    selectPiece(pos) {
        this.selectedHorse = pos;
        this.animations.set(`${pos.row},${pos.col}`, {startTime: Date.now(), bounce: 0, scale: 1});
    }

    deselectPiece() {
        this.selectedHorse = null;
    }

    animateMove(from, to, path, color, onComplete) {
        this.pathDots = [];
        for (let i = 0; i < path.length; i++) {
            this.pathDots.push({
                row: path[i].row,
                col: path[i].col,
                life: 1,
                delay: Date.now() + i * 30
            });
        }
        
        this.movingHorse = {from, to, path, color, startTime: Date.now(), progress: 0, easedProgress: 0, onComplete};
    }

    createEliminationParticles(positions, colors) {
        const palette = ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8e44ad', '#e67e22', '#00d2d3'];
        
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const color = palette[colors[i] - 1] || '#fff';
            const x = pos.col * this.cellSize + this.cellSize / 2;
            const y = pos.row * this.cellSize + this.cellSize / 2;
            
            // 爆炸粒子
            for (let j = 0; j < 12; j++) {
                const angle = (Math.PI * 2 * j) / 12 + Math.random() * 0.5;
                const speed = 4 + Math.random() * 3;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    color,
                    size: 5 + Math.random() * 5,
                    type: 'explosion'
                });
            }
            
            // 闪光星星
            for (let j = 0; j < 4; j++) {
                const angle = (Math.PI * 2 * j) / 4;
                this.particles.push({
                    x, y,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2,
                    life: 0.8,
                    color: '#ffffff',
                    size: 8,
                    type: 'sparkle'
                });
            }
        }
        
        // 屏幕震动效果（通过CSS）
        if (this.canvas) {
            this.canvas.style.transform = 'scale(1.02)';
            setTimeout(() => {
                this.canvas.style.transform = 'scale(1)';
            }, 100);
        }
    }

    lighten(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    darken(color, percent) {
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
        this.renderer = new GameRenderer('game-canvas', this.game);
        
        this.initUI();
        this.initEventListeners();
        this.updateUI();
    }

    initUI() {
        // 生成皮肤选择器
        const skinSelector = document.getElementById('skin-selector');
        const skins = [
            {name: 'classic', display: '经典球', desc: '传统风格'},
            {name: 'horse', display: '马年马', desc: '马年主题'}
        ];
        
        skins.forEach(skin => {
            const div = document.createElement('div');
            div.className = `skin-option ${this.renderer.currentSkin === skin.name ? 'active' : ''}`;
            div.dataset.skin = skin.name;
            div.innerHTML = `
                <div class="skin-preview ${skin.name}"></div>
                <div class="skin-name">${skin.display}</div>
                <div class="skin-desc">${skin.desc}</div>
            `;
            div.addEventListener('click', () => this.switchSkin(skin.name));
            skinSelector.appendChild(div);
        });
        
        // 音效开关
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.checked = this.renderer.audio.enabled;
        soundToggle.addEventListener('change', (e) => {
            this.renderer.audio.setEnabled(e.target.checked);
        });
        
        // 难度按钮
        const diffBtns = document.querySelectorAll('.diff-btn');
        const currentDiff = this.game.colorCount;
        diffBtns.forEach(btn => {
            if (parseInt(btn.dataset.colors) === currentDiff) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', () => {
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.game.setDifficulty(parseInt(btn.dataset.colors));
                this.newGame();
            });
        });
    }

    switchSkin(skinName) {
        this.renderer.setSkin(skinName);
        
        document.querySelectorAll('.skin-option').forEach(el => {
            el.classList.toggle('active', el.dataset.skin === skinName);
        });
        
        this.renderer.render();
    }

    initEventListeners() {
        const canvas = document.getElementById('game-canvas');
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleInput(touch.clientX, touch.clientY);
        }, {passive: false});
        
        canvas.addEventListener('mousedown', (e) => {
            this.handleInput(e.clientX, e.clientY);
        });
        
        document.getElementById('btn-new-game')?.addEventListener('click', () => this.newGame());
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.hideGameOver();
            this.newGame();
        });
        document.getElementById('btn-undo')?.addEventListener('click', () => this.undo());
        document.getElementById('btn-hint')?.addEventListener('click', () => this.showHint());
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-close-settings')?.addEventListener('click', () => this.hideSettings());
    }

    handleInput(clientX, clientY) {
        if (this.game.state.gameOver || this.renderer.movingHorse) return;
        
        const cell = this.renderer.getCellFromPoint(clientX, clientY);
        if (!cell) return;
        
        const {row, col} = cell;
        const cellColor = this.game.state.board[row][col];
        
        if (cellColor !== CellColor.EMPTY) {
            if (this.game.selectBall(cell)) {
                this.renderer.selectPiece(cell);
                this.renderer.audio.play('select');
                this.updateUI();
            }
            return;
        }
        
        if (this.game.state.selectedBall) {
            const path = this.game.findPath(this.game.state.selectedBall, cell);
            if (!path) return;
            
            const from = this.game.state.selectedBall;
            const to = cell;
            const color = this.game.state.board[from.row][from.col];
            
            this.game.moveHistory.push(JSON.parse(JSON.stringify(this.game.state)));
            if (this.game.moveHistory.length > 3) this.game.moveHistory.shift();
            
            this.renderer.animateMove(from, to, path, color, () => {
                const result = this.completeMove(to);
                
                if (result.eliminated) {
                    this.renderer.createEliminationParticles(result.eliminated, result.eliminatedColors);
                    this.renderer.audio.play('eliminate');
                }
                if (result.newBalls) {
                    this.renderer.audio.play('spawn');
                }
                
                this.updateUI();
            });
            
            this.game.state.board[from.row][from.col] = CellColor.EMPTY;
            this.game.state.board[to.row][to.col] = color;
            this.game.state.selectedBall = null;
            this.renderer.deselectPiece();
            
            // 根据路径长度播放音效序列
            this.renderer.audio.playMoveSequence(path.length);
        }
    }

    completeMove(targetPos) {
        const lines = this.game.checkLines(targetPos);
        
        if (lines.length > 0) {
            const eliminatedColors = [];
            for (const line of lines) {
                for (const pos of line) {
                    eliminatedColors.push(this.game.state.board[pos.row][pos.col]);
                }
            }
            
            const eliminated = this.game.eliminateBalls(lines);
            this.game.state.score += eliminated.length * 10;
            
            if (this.game.checkGameOver()) this.game.state.gameOver = true;
            
            return {eliminated, eliminatedColors};
        } else {
            const newBalls = this.game.spawnBalls();
            if (this.game.checkGameOver()) this.game.state.gameOver = true;
            return {newBalls};
        }
    }

    newGame() {
        this.game.initGame();
        this.renderer.deselectPiece();
        this.renderer.particles = [];
        this.updateUI();
    }

    undo() {
        if (this.game.undo()) {
            this.renderer.deselectPiece();
            this.updateUI();
        }
    }

    showHint() {
        // 简化提示
        console.log('提示功能待实现');
    }

    showSettings() {
        document.getElementById('settings-modal')?.classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settings-modal')?.classList.add('hidden');
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.game.state.score;
        document.getElementById('game-over-modal')?.classList.remove('hidden');
    }

    hideGameOver() {
        document.getElementById('game-over-modal')?.classList.add('hidden');
    }

    updateUI() {
        document.getElementById('score').textContent = this.game.state.score;
        
        const highScore = parseInt(localStorage.getItem('lines-high-score') || '0');
        if (this.game.state.score > highScore) {
            localStorage.setItem('lines-high-score', this.game.state.score.toString());
        }
        document.getElementById('high-score').textContent = Math.max(highScore, this.game.state.score);
        
        document.getElementById('btn-undo').disabled = this.game.moveHistory.length === 0;
        
        // 更新下回合预览
        const container = document.getElementById('next-balls');
        if (container) {
            container.innerHTML = '';
            const palette = ['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8e44ad', '#e67e22', '#00d2d3', '#95a5a6', '#34495e'];
            
            for (const color of this.game.state.nextBalls) {
                const slot = document.createElement('div');
                slot.className = 'preview-slot';
                slot.style.backgroundColor = palette[color - 1] || '#666';
                slot.style.border = 'none';
                slot.style.boxShadow = `0 2px 8px ${palette[color - 1]}40`;
                container.appendChild(slot);
            }
        }
        
        if (this.game.state.gameOver) {
            this.showGameOver();
        }
    }
}

// 启动
window.addEventListener('DOMContentLoaded', () => {
    new GameController();
});
