/**
 * 皮肤系统 - 核心接口与加载器
 * Skin System Core
 */

// ==================== 皮肤接口定义 ====================

class Skin {
    constructor(name, displayName, description) {
        this.name = name;
        this.displayName = displayName;
        this.description = description;
        this.sounds = {};
    }

    // 绘制棋子/角色
    draw(ctx, row, col, cellSize, color, animState) {
        throw new Error('Skin must implement draw()');
    }

    // 绘制选中效果
    drawSelection(ctx, x, y, size, color) {
        throw new Error('Skin must implement drawSelection()');
    }

    // 获取主题颜色
    getThemeColors() {
        return {
            background: '#2d3436',
            grid: 'rgba(212, 175, 55, 0.3)',
            border: '#d4af37'
        };
    }

    // 加载音效（可选）
    loadSounds() {
        return Promise.resolve();
    }

    // 播放音效
    playSound(type) {
        // type: 'select', 'move', 'eliminate', 'spawn'
    }
}

// ==================== 皮肤管理器 ====================

class SkinManager {
    constructor() {
        this.skins = new Map();
        this.currentSkin = null;
        this.currentSkinName = localStorage.getItem('lines-game-skin') || 'horse';
    }

    // 注册皮肤
    register(skin) {
        this.skins.set(skin.name, skin);
    }

    // 切换皮肤
    async switchSkin(skinName) {
        const skin = this.skins.get(skinName);
        if (!skin) {
            console.error(`Skin not found: ${skinName}`);
            return false;
        }

        // 加载音效
        await skin.loadSounds();

        this.currentSkin = skin;
        this.currentSkinName = skinName;
        localStorage.setItem('lines-game-skin', skinName);
        
        return true;
    }

    // 获取当前皮肤
    getCurrentSkin() {
        if (!this.currentSkin) {
            this.currentSkin = this.skins.get(this.currentSkinName);
        }
        return this.currentSkin;
    }

    // 获取所有皮肤列表
    getSkinList() {
        return Array.from(this.skins.values()).map(s => ({
            name: s.name,
            displayName: s.displayName,
            description: s.description
        }));
    }
}

// ==================== 经典球皮肤 ====================

class ClassicSkin extends Skin {
    constructor() {
        super('classic', '经典球', '传统五子连珠风格');
        
        this.colorPalette = {
            [CellColor.EMPTY]: 'transparent',
            [CellColor.RED]: '#e63946',      // 鲜红 - 偏冷红
            [CellColor.BLUE]: '#1d3557',     // 深蓝 - 海军蓝
            [CellColor.GREEN]: '#2a9d8f',    // 翠绿 - 偏青绿
            [CellColor.YELLOW]: '#e9c46a',   // 明黄 - 暖黄
            [CellColor.PURPLE]: '#9b5de5',   // 紫罗兰 - 亮紫
            [CellColor.ORANGE]: '#f4a261',   // 橙红 - 偏红的橙色
            [CellColor.CYAN]: '#00b4d8'      // 青色 - 天蓝
        };

        this.audioContext = null;
        this.soundBuffers = {};
    }

    getThemeColors() {
        return {
            background: '#1a1a2e',
            grid: 'rgba(255, 255, 255, 0.1)',
            border: '#667eea'
        };
    }

    async loadSounds() {
        // 使用 Web Audio API 生成简单音效
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 生成水晶音
        this.soundBuffers.select = this.createTone(880, 0.1, 'sine');
        this.soundBuffers.move = this.createTone(440, 0.15, 'triangle');
        this.soundBuffers.eliminate = this.createChord([523.25, 659.25, 783.99], 0.3);
        this.soundBuffers.spawn = this.createTone(330, 0.1, 'sine');
    }

    createTone(frequency, duration, type = 'sine') {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            // 衰减
            const envelope = Math.max(0, 1 - t / duration);
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        
        return buffer;
    }

    createChord(frequencies, duration) {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - t / duration);
            let sample = 0;
            
            for (const freq of frequencies) {
                sample += Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
            }
            
            data[i] = sample;
        }
        
        return buffer;
    }

    playSound(type) {
        if (!this.audioContext || !this.soundBuffers[type]) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[type];
        source.connect(this.audioContext.destination);
        source.start();
    }

    draw(ctx, row, col, cellSize, color, animState) {
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const radius = cellSize * 0.35 * (animState?.scale || 1);
        const bounceY = (animState?.bounce || 0) * cellSize * 0.1;

        // 外发光
        ctx.shadowColor = this.colorPalette[color];
        ctx.shadowBlur = 15;

        // 球体渐变
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3 + bounceY, 0,
            x, y + bounceY, radius
        );
        gradient.addColorStop(0, this.lightenColor(this.colorPalette[color], 40));
        gradient.addColorStop(0.5, this.colorPalette[color]);
        gradient.addColorStop(1, this.darkenColor(this.colorPalette[color], 30));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y + bounceY, radius, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(
            x - radius * 0.3,
            y + bounceY - radius * 0.3,
            radius * 0.25,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    drawSelection(ctx, x, y, size, color) {
        ctx.shadowColor = this.colorPalette[color];
        ctx.shadowBlur = 30;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
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

// ==================== 马年马皮肤 ====================

class HorseSkin extends Skin {
    constructor() {
        super('horse', '马年马', '马年主题，七匹名马');
        
        this.colorPalette = {
            [CellColor.EMPTY]: 'transparent',
            [CellColor.RED]: '#c0392b',      // 赤兔 - 深红
            [CellColor.BLUE]: '#1d3557',     // 蓝鬃 - 深蓝
            [CellColor.GREEN]: '#27ae60',    // 青骢 - 翠绿
            [CellColor.YELLOW]: '#e9c46a',   // 金马 - 暖黄
            [CellColor.PURPLE]: '#9b5de5',   // 紫骍 - 亮紫
            [CellColor.ORANGE]: '#f4a261',   // 骅骝 - 橙红
            [CellColor.CYAN]: '#1abc9c'      // 白龙 - 青绿
        };

        this.horseNames = {
            [CellColor.EMPTY]: '',
            [CellColor.RED]: '赤兔',
            [CellColor.BLUE]: '蓝鬃',
            [CellColor.GREEN]: '青骢',
            [CellColor.YELLOW]: '金马',
            [CellColor.PURPLE]: '紫骍',
            [CellColor.ORANGE]: '骅骝',
            [CellColor.CYAN]: '白龙'
        };

        this.audioContext = null;
        this.soundBuffers = {};
    }

    getThemeColors() {
        return {
            background: '#2d3436',
            grid: 'rgba(212, 175, 55, 0.3)',
            border: '#d4af37'
        };
    }

    async loadSounds() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 生成马嘶鸣声（锯齿波+滤波器模拟）
        this.soundBuffers.select = this.createHorseWhinny(800, 0.3);
        // 马蹄声（短促脉冲）
        this.soundBuffers.move = this.createHoofBeat();
        // 群马嘶鸣（和弦）
        this.soundBuffers.eliminate = this.createChord([523.25, 659.25, 783.99, 1046.5], 0.5);
        // 远处马声
        this.soundBuffers.spawn = this.createHorseWhinny(600, 0.4, true);
    }

    createHorseWhinny(baseFreq, duration, distant = false) {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            // 频率滑动（嘶鸣效果）
            const freq = baseFreq + Math.sin(t * 10) * 100 + t * 200;
            const envelope = Math.max(0, 1 - t / duration);
            
            let sample = Math.sin(2 * Math.PI * freq * t) * envelope;
            
            // 添加锯齿波谐波
            sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 * envelope;
            sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.1 * envelope;
            
            // 远距离效果
            if (distant) {
                sample *= 0.5;
                // 简单低通滤波
                if (i > 0) {
                    sample = (sample + data[i - 1]) * 0.3;
                }
            }
            
            data[i] = sample * 0.3;
        }
        
        return buffer;
    }

    createHoofBeat() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const duration = 0.1;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        // 白噪声脉冲
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 20);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
        }
        
        return buffer;
    }

    createChord(frequencies, duration) {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const buffer = ctx.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.max(0, 1 - t / duration);
            let sample = 0;
            
            for (const freq of frequencies) {
                sample += Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
            }
            
            data[i] = sample;
        }
        
        return buffer;
    }

    playSound(type) {
        if (!this.audioContext || !this.soundBuffers[type]) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[type];
        source.connect(this.audioContext.destination);
        source.start();
    }

    draw(ctx, row, col, cellSize, color, animState) {
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;
        const size = cellSize * 0.35 * (animState?.scale || 1);
        const bounceY = (animState?.bounce || 0) * size;

        ctx.save();
        ctx.translate(x, y + bounceY);

        // 根据移动方向翻转（如果有方向信息）
        if (animState?.facingLeft) {
            ctx.scale(-1, 1);
        }

        // 绘制不同颜色的马
        switch(color) {
            case CellColor.RED:
                this.drawRedHorse(ctx, size);
                break;
            case CellColor.BLUE:
                this.drawBlueHorse(ctx, size);
                break;
            case CellColor.GREEN:
                this.drawGreenHorse(ctx, size);
                break;
            case CellColor.YELLOW:
                this.drawYellowHorse(ctx, size);
                break;
            case CellColor.PURPLE:
                this.drawPurpleHorse(ctx, size);
                break;
            case CellColor.ORANGE:
                this.drawOrangeHorse(ctx, size);
                break;
            case CellColor.CYAN:
                this.drawCyanHorse(ctx, size);
                break;
        }

        ctx.restore();
    }

    drawSelection(ctx, x, y, size, color) {
        ctx.shadowColor = this.colorPalette[color];
        ctx.shadowBlur = 30;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
    }

    // 各色马绘制方法
    drawRedHorse(ctx, size) {
        this.drawHorseBody(ctx, size, '#c0392b');
        
        // 烈焰鬃毛
        ctx.fillStyle = '#e74c3c';
        for (let i = 0; i < 5; i++) {
            const angle = -Math.PI / 2 + (i - 2) * 0.3;
            const flameSize = size * (0.4 + Math.sin(Date.now() / 200 + i) * 0.1);
            ctx.beginPath();
            ctx.ellipse(
                Math.cos(angle) * size * 0.7,
                Math.sin(angle) * size * 0.5 - size * 0.3,
                flameSize * 0.3,
                flameSize * 0.6,
                angle,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        this.drawEyes(ctx, size, '#fff');
    }

    drawBlueHorse(ctx, size) {
        this.drawHorseBody(ctx, size, '#2980b9');
        
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const x = -size * 0.3 + i * size * 0.3;
            const y = -size * 0.6;
            ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
        }
        ctx.fill();
        
        this.drawEyes(ctx, size, '#fff');
    }

    drawGreenHorse(ctx, size) {
        this.drawHorseBody(ctx, size, '#27ae60');
        
        ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < 3; i++) {
            const angle = -Math.PI / 3 + i * Math.PI / 6;
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.ellipse(0, -size * 0.8, size * 0.15, size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        this.drawEyes(ctx, size, '#fff');
    }

    drawYellowHorse(ctx, size) {
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 20;
        
        this.drawHorseBody(ctx, size, '#f39c12');
        
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, -size * 0.5, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        this.drawEyes(ctx, size, '#fff');
    }

    drawPurpleHorse(ctx, size) {
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, Date.now() / 500, Date.now() / 500 + Math.PI * 1.5);
        ctx.stroke();
        
        this.drawHorseBody(ctx, size, '#8e44ad');
        
        ctx.fillStyle = '#bb8fce';
        for (let i = 0; i < 6; i++) {
            const angle = (Date.now() / 1000 + i / 6) * Math.PI * 2;
            const r = size * 0.6;
            ctx.beginPath();
            ctx.arc(
                Math.cos(angle) * r * 0.5,
                -size * 0.5 + Math.sin(angle) * r * 0.3,
                size * 0.1,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        this.drawEyes(ctx, size, '#fff');
    }

    drawOrangeHorse(ctx, size) {
        this.drawHorseBody(ctx, size, '#e67e22');
        
        ctx.fillStyle = '#f39c12';
        for (let i = 0; i < 4; i++) {
            const t = Date.now() / 300 + i;
            const x = size * 0.6 + Math.sin(t) * size * 0.2;
            const y = Math.cos(t * 1.3) * size * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.drawEyes(ctx, size, '#fff');
    }

    drawCyanHorse(ctx, size) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const radius = size * (0.8 + i * 0.3 + Math.sin(Date.now() / 800 + i) * 0.1);
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        this.drawHorseBody(ctx, size, '#1abc9c');
        
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(0, -size * 0.5, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        
        this.drawEyes(ctx, size, '#2c3e50');
    }

    drawHorseBody(ctx, size, color) {
        const gradient = ctx.createRadialGradient(
            -size * 0.2, -size * 0.2, 0,
            0, 0, size
        );
        gradient.addColorStop(0, this.lightenColor(color, 30));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, this.darkenColor(color, 20));
        
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.1, size * 0.5, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-size * 0.3, -size * 0.5);
        ctx.lineTo(-size * 0.4, -size * 0.8);
        ctx.lineTo(-size * 0.1, -size * 0.6);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(size * 0.3, -size * 0.5);
        ctx.lineTo(size * 0.4, -size * 0.8);
        ctx.lineTo(size * 0.1, -size * 0.6);
        ctx.fill();
        
        ctx.fillStyle = this.darkenColor(color, 30);
        ctx.beginPath();
        ctx.ellipse(0, size * 0.4, size * 0.25, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEyes(ctx, size, eyeColor) {
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(-size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(size * 0.2, -size * 0.2, size * 0.12, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.2, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-size * 0.15, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        ctx.arc(size * 0.25, -size * 0.25, size * 0.03, 0, Math.PI * 2);
        ctx.fill();
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

// ==================== 全局皮肤管理器实例 ====================

const skinManager = new SkinManager();

// 注册默认皮肤
skinManager.register(new ClassicSkin());
skinManager.register(new HorseSkin());
