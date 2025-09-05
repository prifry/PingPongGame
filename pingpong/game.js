// Menu toggle for button panel
const menuToggle = document.getElementById('menuToggle');
const buttonPanel = document.getElementById('buttonPanel');

menuToggle.addEventListener('click', function() {
    buttonPanel.classList.toggle('hidden');
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const settingsBtn = document.getElementById('settingsBtn');
const scoreboard = document.getElementById('scoreboard');
const highScoresDiv = document.getElementById('highScores');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartBtn = document.getElementById('restartBtn');
const settingsMenu = document.getElementById('settingsMenu');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const difficultySelect = document.getElementById('difficultySelect');
const twoPlayerToggle = document.getElementById('twoPlayerToggle');

let soundOn = true;
let paused = false;
let difficulty = 'normal';
let twoPlayer = false;
let highScores = [];
let gameOver = false;
let powerUp = null;
let powerUpTimer = 0;
let powerUpActive = false;
let ballTrail = [];

// Sound effects
const hitSound = new Audio('418556__14fpanskabubik_lukas__ping-pong-hit.wav');
const wallSound = new Audio('418556__14fpanskabubik_lukas__ping-pong-hit.wav');

let audioUnlocked = false;
function unlockAudio() {
    if (!audioUnlocked) {
        // Play a silent sound to unlock audio context
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const source = ctx.createBufferSource();
        source.buffer = ctx.createBuffer(1, 1, 22050);
        source.connect(ctx.destination);
        source.start(0);
        audioUnlocked = true;
    }
}

let paddleWidth = 120;
let paddleHeight = 20;
const ballRadius = 12;

let playerX = (canvas.width - paddleWidth) / 2;
let aiX = (canvas.width - paddleWidth) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = 5;
let ballSpeedY = 5;
let playerScore = 0;
let aiScore = 0;

let gameRunning = false;

function drawPaddle(x, y, isPlayer) {
    ctx.save();
    ctx.fillStyle = isPlayer ? '#2196f3' : '#1976d2';
    ctx.shadowColor = isPlayer ? '#2196f3' : '#1976d2';
    ctx.shadowBlur = 10;
    ctx.fillRect(x, y, paddleWidth, paddleHeight);
    ctx.restore();
}

function drawBall(x, y) {
    // Ball trail effect
    ballTrail.push({x, y});
    if (ballTrail.length > 10) ballTrail.shift();
    for (let i = 0; i < ballTrail.length; i++) {
        ctx.beginPath();
        ctx.arc(ballTrail[i].x, ballTrail[i].y, ballRadius - i, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,0,${(10-i)/10})`;
        ctx.fill();
        ctx.closePath();
    }
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0';
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function drawScores() {
    ctx.font = '32px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(playerScore, 20, canvas.height - 30);
    ctx.fillText(aiScore, 20, 50);
}

function drawPowerUp() {
    if (powerUp) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = powerUp.type === 'bigPaddle' ? '#4caf50' : '#e91e63';
        ctx.fill();
        ctx.font = '16px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(powerUp.type === 'bigPaddle' ? 'BIG' : 'SLOW', powerUp.x, powerUp.y + 6);
        ctx.restore();
    }
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let speed = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 5;
    ballSpeedY = -ballSpeedY;
    ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * speed;
    ballSpeedY = (ballSpeedY > 0 ? speed : -speed);
}

function update() {
    if (paused || gameOver) return;
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Power-up spawn
    if (!powerUp && Math.random() < 0.002) {
        powerUp = {
            x: Math.random() * (canvas.width - 36) + 18,
            y: Math.random() * (canvas.height - 200) + 100,
            type: Math.random() < 0.5 ? 'bigPaddle' : 'slowBall'
        };
        powerUpTimer = 600; // frames
    }
    if (powerUp) {
        powerUpTimer--;
        if (powerUpTimer <= 0) {
            powerUp = null;
            powerUpActive = false;
        }
        // Collision with ball
        let dx = ballX - powerUp.x;
        let dy = ballY - powerUp.y;
        if (Math.sqrt(dx*dx + dy*dy) < ballRadius + 18 && !powerUpActive) {
            powerUpActive = true;
            if (powerUp.type === 'bigPaddle') {
                paddleWidth = 180;
                setTimeout(() => {
                    paddleWidth = 120;
                    powerUpActive = false;
                }, 5000);
            } else if (powerUp.type === 'slowBall') {
                ballSpeedX *= 0.5;
                ballSpeedY *= 0.5;
                setTimeout(() => {
                    let speed = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 5;
                    ballSpeedX = (ballSpeedX > 0 ? speed : -speed);
                    ballSpeedY = (ballSpeedY > 0 ? speed : -speed);
                    powerUpActive = false;
                }, 5000);
            }
            powerUp = null;
        }
    }

    // Ball collision with walls
    if (ballX - ballRadius < 0 || ballX + ballRadius > canvas.width) {
        ballSpeedX = -ballSpeedX;
        if (soundOn) playHitSound();
    }

    // Ball collision with player paddle
    if (
        ballY + ballRadius > canvas.height - paddleHeight &&
        ballX > playerX && ballX < playerX + paddleWidth
    ) {
        ballSpeedY = -ballSpeedY;
        ballY = canvas.height - paddleHeight - ballRadius;
        if (soundOn) playHitSound();
    }

    // Ball collision with AI paddle or second player
    if (
        ballY - ballRadius < paddleHeight &&
        ballX > aiX && ballX < aiX + paddleWidth
    ) {
        ballSpeedY = -ballSpeedY;
        ballY = paddleHeight + ballRadius;
        if (soundOn) playHitSound();
    }

    // Score
    if (ballY - ballRadius < 0) {
        playerScore++;
        resetBall();
        checkGameOver();
    }
    if (ballY + ballRadius > canvas.height) {
        aiScore++;
        resetBall();
        checkGameOver();
    }

    // AI movement or second player
    if (!twoPlayer) {
        let aiSpeed = difficulty === 'easy' ? 0.04 : difficulty === 'hard' ? 0.12 : 0.08;
        aiX += ((ballX - (aiX + paddleWidth / 2)) * aiSpeed);
        aiX = Math.max(0, Math.min(canvas.width - paddleWidth, aiX));
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaddle(playerX, canvas.height - paddleHeight, true);
    drawPaddle(aiX, 0, false);
    drawBall(ballX, ballY);
    drawScores();
    drawPowerUp();
    if (!gameRunning && !gameOver) {
        ctx.font = '48px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('Press Start to Play!', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    if (gameRunning && !paused && !gameOver) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();

// Touch controls for iPhone
let touchStartX = null;


// Touch controls for iPhone (single listener)
canvas.addEventListener('touchmove', function(e) {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    // Get touch X relative to canvas
    const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);

    // Move paddle centered on finger
    playerX = touchX - paddleWidth / 2;

    // Keep paddle inside canvas
    playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));

    e.preventDefault(); // prevent scrolling
}, { passive: false });

// Tap controls (left/right screen zones)
const leftControl = document.getElementById('leftControl');
const rightControl = document.getElementById('rightControl');

leftControl.addEventListener('touchstart', function(e) {
    if (gameOver) return;
    playerX -= 40; // move left by 40px
    playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));
    e.preventDefault();
}, { passive: false });

rightControl.addEventListener('touchstart', function(e) {
    if (gameOver) return;
    playerX += 40; // move right by 40px
    playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));
    e.preventDefault();
}, { passive: false });

// Mouse controls for desktop
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    playerX = e.clientX - rect.left - paddleWidth / 2;
    playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));
});

// Keyboard controls for desktop
document.addEventListener('keydown', function(e) {
    if (gameOver) return;
    if (e.key === 'ArrowLeft') {
        playerX -= 40;
        playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));
    } else if (e.key === 'ArrowRight') {
        playerX += 40;
        playerX = Math.max(0, Math.min(canvas.width - paddleWidth, playerX));
    }
    if (twoPlayer) {
        // W/S for second player
        if (e.key === 'a') {
            aiX -= 20;
            aiX = Math.max(0, Math.min(canvas.width - paddleWidth, aiX));
        } else if (e.key === 'd') {
            aiX += 20;
            aiX = Math.max(0, Math.min(canvas.width - paddleWidth, aiX));
        }
    }
    // Pause/Resume
    if (e.key === 'p') {
        paused = !paused;
        pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    }
});

// Start and End Game button functionality
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');

startBtn.addEventListener('click', function() {
    unlockAudio();
    playerScore = 0;
    aiScore = 0;
    resetBall();
    gameOver = false;
    gameRunning = true;
    gameOverScreen.style.display = 'none';
    scoreboard.style.display = 'none';
    highScoresDiv.innerHTML = '';
    powerUpActive = false;
});

endBtn.addEventListener('click', function() {
    unlockAudio();
    gameRunning = false;
    paused = false;
    pauseBtn.textContent = 'Pause';
    scoreboard.style.display = 'block';
    showHighScores();
});

pauseBtn.addEventListener('click', function() {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

settingsBtn.addEventListener('click', function() {
    settingsMenu.style.display = 'block';
});

closeSettingsBtn.addEventListener('click', function() {
    settingsMenu.style.display = 'none';
});

difficultySelect.addEventListener('change', function() {
    difficulty = difficultySelect.value;
    resetBall();
});

twoPlayerToggle.addEventListener('change', function() {
    twoPlayer = twoPlayerToggle.checked;
});

restartBtn.addEventListener('click', function() {
    gameOverScreen.style.display = 'none';
    startBtn.click();
});

// Sound toggle button
soundBtn.addEventListener('click', function() {
    unlockAudio();
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? 'Sound: On' : 'Sound: Off';
});

function checkGameOver() {
    if (playerScore >= 5 || aiScore >= 5) {
        gameOver = true;
        gameRunning = false;
        gameOverScreen.style.display = 'flex';
        gameOverMessage.textContent = playerScore > aiScore ? 'You Win!' : 'You Lose!';
        saveHighScore(playerScore, aiScore);
        showHighScores();
    }
}

function saveHighScore(player, ai) {
    highScores.push({ player, ai, date: new Date().toLocaleString() });
    if (highScores.length > 5) highScores.shift();
    localStorage.setItem('pingpongHighScores', JSON.stringify(highScores));
}

function showHighScores() {
    let scores = highScores.length ? highScores : JSON.parse(localStorage.getItem('pingpongHighScores') || '[]');
    highScoresDiv.innerHTML = scores.map(s => `<div>${s.date}: You ${s.player} - AI ${s.ai}</div>`).join('');
}

function playHitSound() {
    const audio = new Audio('418556__14fpanskabubik_lukas__ping-pong-hit.wav');
    audio.play();
}

