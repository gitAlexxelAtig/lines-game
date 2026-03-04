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
        this.animations = new Map(); // 位置 -> 动画状态
        this.particles = []; // 粒子效果
        
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

    // ==================== 动画循环 ====================
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

        // 更新粒子
        this.particles = this.particles.filter(p => {
            p.life -= 0.02;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // 重力
            return p.life > 0;
        });
    }

    // ==================== 主渲染 ====================
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        this.drawGrid();
        this.drawHorses();
        this.drawParticles();
    }

    drawBackground() {
        // 木纹背景效果
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#2d3436');
        gradient.addColorStop(0.5, '#3d3d3d');
        gradient.addColorStop(1, '#2d3436');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 棋盘边框
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

    // ==================== 绘制小马 ====================
    drawHorses() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
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
        
        // 获取动画状态
        const key = `${row},${col}`;
        let anim = this.animations.get(key);
        if (!anim) {
            anim = { startTime: Date.now(), bounce: 0, scale: 1 };
            this.animations.set(key, anim);
        }

        // 选中效果 - 发光边框
        if (this.selectedHorse && this.selectedHorse.row === row && this.selectedHorse.col === col) {
            this.ctx.shadowColor = COLOR_PALETTE[color];
            this.ctx.shadowBlur = 30;
            
            // 选中光环
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // 保存上下文
        this.ctx.save();
        
        // 应用到小马的变换
        const bounceY = anim.bounce * size;
        this.ctx.translate(x, y + bounceY);
        this.ctx.scale(anim.scale, anim.scale);

        // 绘制不同颜色的小马
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

    // ==================== 各色小马绘制 ====================
    
    // 赤兔马 - 红色，烈焰鬃毛
    drawRedHorse(size) {
        const bodyColor = '#c0392b';
        const maneColor = '#e74c3c';
        
        // 身体
        this.drawHorseBody(size, bodyColor);
        
        // 烈焰鬃毛效果
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
        
        // 眼睛
        this.drawEyes(size, '#fff');
    }

    // 蓝鬃马 - 蓝色，波浪鬃毛
    drawBlueHorse(size) {
        const bodyColor = '#2980b9';
        const maneColor = '#3498db';
        
        this.drawHorseBody(size, bodyColor);
        
        // 波浪鬃毛
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

    // 青骢马 - 绿色，竹叶装饰
    drawGreenHorse(size) {
        const bodyColor = '#27ae60';
        
        this.drawHorseBody(size, bodyColor);
        
        // 竹叶装饰
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

    // 金马 - 金色，闪耀效果
    drawYellowHorse(size) {
        const bodyColor = '#f39c12';
        const shineColor = '#f1c40f';
        
        // 发光效果
        this.ctx.shadowColor = shineColor;
        this.ctx.shadowBlur = 20;
        
        this.drawHorseBody(size, bodyColor);
        
        // 金色鬃毛
        this.ctx.fillStyle = shineColor;
        this.ctx.beginPath();
        this.ctx.arc(0, -size * 0.5, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
        this.drawEyes(size, '#fff');
    }

    // 紫骍马 - 紫色，神秘光环
    drawPurpleHorse(size) {
        const bodyColor = '#8e44ad';
        
        // 神秘光环
        this.ctx.strokeStyle = '#9b59b6';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.2, Date.now() / 500, Date.now() / 500 + Math.PI * 1.5);
        this.ctx.stroke();
        
        this.drawHorseBody(size, bodyColor);
        
        // 星空鬃毛
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

    // 骅骝马 - 橙色，火焰效果
    drawOrangeHorse(size) {
        const bodyColor = '#e67e22';
        
        this.drawHorseBody(size, bodyColor);
        
        // 火焰尾巴效果
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

    // 白龙马 - 青色/白色，仙气效果
    drawCyanHorse(size) {
        const bodyColor = '#1abc9c';
        
        // 仙气光环
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const radius = size * (0.8 + i * 0.3 + Math.sin(Date.now() / 800 + i) * 0.1);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.drawHorseBody(size, bodyColor);
        
        // 白色鬃毛
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.beginPath();
        this.ctx.arc(0, -size * 0.5, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.drawEyes(size, '#2c3e50');
    }

    // ==================== 通用小马身体 ====================
    drawHorseBody(size, color) {
        // 身体渐变
        const gradient = this.ctx.createRadialGradient(
            -size * 0.2, -size * 0.2, 0,
            0, 0, size
        );
        gradient.addColorStop(0, this.lightenColor(color, 30));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, this.darkenColor(color, 20));
        
        this.ctx.fillStyle = gradient;
        
        // 马头（椭圆形）
        this.ctx.beginPath();
        this.ctx.ellipse(0, -size * 0.1, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 马耳
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
        
        // 马嘴
        this.ctx.fillStyle = this.darkenColor(color, 30);
        this.ctx.beginPath();
        this.ctx.ellipse(0, size * 0.4, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawEyes(size, eyeColor) {
        // 左眼
        this.ctx.fillStyle = eyeColor;
        this.ctx.beginPath();
        this.ctx.ellipse(-size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 右眼
        this.ctx.beginPath();
        this.ctx.ellipse(size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 瞳孔
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        this.ctx.arc(size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 高光
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.15, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        this.ctx.arc(size * 0.25, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // ==================== 粒子效果 ====================
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

    // ==================== 动画触发 ====================
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

    // ==================== 工具函数 ====================
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
            const result = this.game.moveBall(cell);

            if (result.success) {
                this.renderer.deselectHorse();

                if (result.eliminated) {
                    this.renderer.createEliminationParticles(result.eliminated);
                    // 播放消除音效
                    this.playSound('eliminate');
                }

                if (result.newBalls) {
                    this.renderer.createSpawnParticles(result.newBalls);
                    // 播放生成音效
                    this.playSound('spawn');
                }

                this.updateUI();
                this.updateNextBalls();

                if (this.game.state.gameOver) {
                    this.showGameOver();
                }
            }
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

        if (undoBtn) undoBtn.disabled = false;
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
            
            // 添加小马名字提示
            slot.title = HORSE_NAMES[color];
            
            container.appendChild(slot);
        }
    }

    playSound(type) {
        // 预留音效接口
        // TODO: 添加 Web Audio API 音效
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
