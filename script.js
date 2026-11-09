const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const diffBtns = document.querySelectorAll('.diff-btn');

// Game Constants
const GRID_SIZE = 20;

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let dx = GRID_SIZE;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snake_high_score') || 0;
let gameInterval = null;
let gameSpeed = 100; // Default Medium speed
let isPlaying = false;
let nextDirection = { dx: GRID_SIZE, dy: 0 };

highScoreEl.textContent = highScore;

// Sound Effects via Web Audio API
class SoundEffects {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playEat() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playGameOver() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}

const sounds = new SoundEffects();

// Difficulty Buttons
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameSpeed = parseInt(btn.dataset.speed);
    });
});

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyPress);

// On-screen Controls
document.getElementById('btn-up').addEventListener('click', () => setDirection(0, -GRID_SIZE));
document.getElementById('btn-down').addEventListener('click', () => setDirection(0, GRID_SIZE));
document.getElementById('btn-left').addEventListener('click', () => setDirection(-GRID_SIZE, 0));
document.getElementById('btn-right').addEventListener('click', () => setDirection(GRID_SIZE, 0));

function startGame() {
    sounds.init();
    snake = [
        { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE },
        { x: 4 * GRID_SIZE, y: 10 * GRID_SIZE },
        { x: 3 * GRID_SIZE, y: 10 * GRID_SIZE }
    ];
    dx = GRID_SIZE;
    dy = 0;
    nextDirection = { dx: GRID_SIZE, dy: 0 };
    score = 0;
    scoreEl.textContent = score;
    
    spawnFood();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    isPlaying = true;

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function gameLoop() {
    update();
    draw();
}

function update() {
    dx = nextDirection.dx;
    dy = nextDirection.dy;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall Collision Check
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        return gameOver();
    }

    // Self Collision Check
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return gameOver();
        }
    }

    snake.unshift(head);

    // Food Collision Check
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        sounds.playEat();
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('snake_high_score', highScore);
        }
        spawnFood();
    } else {
        snake.pop();
    }
}

function draw() {
    // Clear Canvas & Draw Grid
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#121624';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 12;
    ctx.fillRect(food.x + 2, food.y + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    // Draw Snake
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = '#00ffcc';
            ctx.shadowColor = '#00ffcc';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillStyle = '#00b38f';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(segment.x + 1, segment.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    ctx.shadowBlur = 0;
}

function spawnFood() {
    let validLocation = false;
    while (!validLocation) {
        food.x = Math.floor(Math.random() * (canvas.width / GRID_SIZE)) * GRID_SIZE;
        food.y = Math.floor(Math.random() * (canvas.height / GRID_SIZE)) * GRID_SIZE;
        validLocation = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
}

function handleKeyPress(e) {
    if (!isPlaying) return;

    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
            setDirection(0, -GRID_SIZE); break;
        case 'ArrowDown': case 's': case 'S':
            setDirection(0, GRID_SIZE); break;
        case 'ArrowLeft': case 'a': case 'A':
            setDirection(-GRID_SIZE, 0); break;
        case 'ArrowRight': case 'd': case 'D':
            setDirection(GRID_SIZE, 0); break;
    }
}

function setDirection(newDx, newDy) {
    if (newDx === -dx && newDx !== 0) return;
    if (newDy === -dy && newDy !== 0) return;
    nextDirection = { dx: newDx, dy: newDy };
}

function gameOver() {
    isPlaying = false;
    clearInterval(gameInterval);
    sounds.playGameOver();
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}