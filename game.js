// ============================================
// BRAIN RACERS - SHAPE COLLECTOR GAME
// ============================================

// Game State
const gameState = {
    isRunning: false,
    score: 0,
    combo: 0,
    timeLeft: 30,
    power: 0,
    maxPower: 100,
    targetShape: 'triangle', // Current shape to collect
    shapes: [],
    character: null,
    lastFrameTime: 0,
    animationId: null
};

// Game Configuration
const config = {
    // Timer settings - modify these to change game duration
    initialTime: 30, // seconds
    
    // Scoring settings - modify these to adjust scoring
    correctShapePoints: 10,
    wrongShapePenalty: 5,
    comboMultiplier: 1.5, // Each combo multiplies points by this
    
    // Power settings - modify these to adjust power meter
    correctShapePower: 10,
    wrongShapePowerLoss: 15,
    
    // Character settings - modify these to change character behavior
    characterSpeed: 2, // pixels per frame
    characterSize: 60,
    characterStartX: 50,
    
    // Shape settings - modify these to change shape spawning
    shapeSpawnRate: 0.02, // probability per frame (0-1)
    shapeSpeed: 3, // pixels per frame
    shapeSize: 50,
    minShapeDistance: 100, // minimum pixels between shapes
    
    // Shape types - add or modify shapes here
    shapeTypes: ['circle', 'triangle', 'square', 'rectangle']
};

// Canvas and Context
let canvas, ctx;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeGame();
});

// ============================================
// UI INITIALIZATION
// ============================================

function initializeUI() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilterClick(btn, 'category'));
    });
    
    // Grade buttons
    const gradeButtons = document.querySelectorAll('.grade-btn');
    gradeButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilterClick(btn, 'grade'));
    });
    
    // Card click handlers
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', () => handleCardClick(card));
    });
    
    // START button
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', startGame);
    
    // Close game button
    const closeGameBtn = document.getElementById('closeGameBtn');
    closeGameBtn.addEventListener('click', stopGame);
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function handleFilterClick(btn, type) {
    if (type === 'category') {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.dataset.category;
        filterCards('category', category);
    } else if (type === 'grade') {
        document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const grade = btn.dataset.grade;
        filterCards('grade', grade);
    }
}

function filterCards(type, value) {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (value === 'all') {
            card.style.display = 'block';
        } else {
            const cardValue = card.dataset[type];
            if (cardValue === value) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function handleCardClick(card) {
    const title = card.querySelector('.card-title').textContent;
    if (title === 'Shape Collector') {
        startGame();
    }
}

// ============================================
// GAME INITIALIZATION
// ============================================

function initializeGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Character initialization
    gameState.character = {
        x: config.characterStartX,
        y: canvas.height / 2,
        size: config.characterSize
    };
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth - 40;
    canvas.height = container.clientHeight - 200; // Account for header and power meter
}

// ============================================
// GAME CONTROL
// ============================================

function startGame() {
    // Show game overlay
    const gameOverlay = document.getElementById('gameOverlay');
    gameOverlay.classList.add('active');
    
    // Reset game state
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.timeLeft = config.initialTime;
    gameState.power = 0;
    gameState.shapes = [];
    gameState.character.x = config.characterStartX;
    gameState.character.y = canvas.height / 2;
    
    // Set random target shape
    setRandomTargetShape();
    
    // Update UI
    updateUI();
    
    // Start game loop
    gameState.lastFrameTime = performance.now();
    gameLoop();
    
    // Start timer
    startTimer();
}

function stopGame() {
    gameState.isRunning = false;
    
    if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
    }
    
    // Hide game overlay
    const gameOverlay = document.getElementById('gameOverlay');
    gameOverlay.classList.remove('active');
}

function setRandomTargetShape() {
    const randomIndex = Math.floor(Math.random() * config.shapeTypes.length);
    gameState.targetShape = config.shapeTypes[randomIndex];
    updateTaskBanner();
}

function updateTaskBanner() {
    const taskBanner = document.getElementById('taskBanner');
    const shapeName = gameState.targetShape.charAt(0).toUpperCase() + gameState.targetShape.slice(1);
    taskBanner.textContent = `Collect ${shapeName}s`;
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop(currentTime) {
    if (!gameState.isRunning) return;
    
    const deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update character position
    updateCharacter();
    
    // Spawn shapes
    spawnShapes();
    
    // Update shapes
    updateShapes();
    
    // Draw everything
    drawBackground();
    drawCharacter();
    drawShapes();
    
    // Continue loop
    gameState.animationId = requestAnimationFrame(gameLoop);
}

// ============================================
// CHARACTER
// ============================================

function updateCharacter() {
    // Move character from left to right
    gameState.character.x += config.characterSpeed;
    
    // Reset position when off screen
    if (gameState.character.x > canvas.width + gameState.character.size) {
        gameState.character.x = -gameState.character.size;
    }
    
    // Keep character centered vertically
    gameState.character.y = canvas.height / 2;
}

function drawCharacter() {
    ctx.save();
    
    // Draw character (simple representation)
    const char = gameState.character;
    
    // Body (circle)
    ctx.fillStyle = '#40e0d0';
    ctx.beginPath();
    ctx.arc(char.x, char.y, char.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(char.x - 10, char.y - 10, 5, 0, Math.PI * 2);
    ctx.arc(char.x + 10, char.y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#40e0d0';
    ctx.strokeStyle = '#40e0d0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(char.x, char.y, char.size / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

// ============================================
// SHAPES
// ============================================

function spawnShapes() {
    // Random chance to spawn a shape
    if (Math.random() < config.shapeSpawnRate) {
        // Check minimum distance from existing shapes
        let canSpawn = true;
        const newX = canvas.width + config.shapeSize;
        const newY = Math.random() * (canvas.height - config.shapeSize * 2) + config.shapeSize;
        
        for (const shape of gameState.shapes) {
            const distance = Math.sqrt(
                Math.pow(shape.x - newX, 2) + Math.pow(shape.y - newY, 2)
            );
            if (distance < config.minShapeDistance) {
                canSpawn = false;
                break;
            }
        }
        
        if (canSpawn) {
            // Random shape type
            const randomIndex = Math.floor(Math.random() * config.shapeTypes.length);
            const shapeType = config.shapeTypes[randomIndex];
            
            gameState.shapes.push({
                x: newX,
                y: newY,
                type: shapeType,
                size: config.shapeSize,
                speed: config.shapeSpeed,
                alpha: 1
            });
        }
    }
}

function updateShapes() {
    for (let i = gameState.shapes.length - 1; i >= 0; i--) {
        const shape = gameState.shapes[i];
        
        // Move shape from right to left
        shape.x -= shape.speed;
        
        // Remove shapes that are off screen
        if (shape.x + shape.size < 0) {
            gameState.shapes.splice(i, 1);
            continue;
        }
    }
}

function drawShapes() {
    gameState.shapes.forEach(shape => {
        ctx.save();
        ctx.globalAlpha = shape.alpha;
        
        // Set color based on whether it's the target shape
        const isTarget = shape.type === gameState.targetShape;
        ctx.fillStyle = isTarget ? '#40e0d0' : '#ff6b6b';
        ctx.strokeStyle = isTarget ? '#00ced1' : '#ff4757';
        ctx.lineWidth = 3;
        
        // Draw shape based on type
        switch (shape.type) {
            case 'circle':
                drawCircle(shape.x, shape.y, shape.size / 2);
                break;
            case 'triangle':
                drawTriangle(shape.x, shape.y, shape.size);
                break;
            case 'square':
                drawSquare(shape.x, shape.y, shape.size);
                break;
            case 'rectangle':
                drawRectangle(shape.x, shape.y, shape.size);
                break;
        }
        
        // Glow effect for target shapes
        if (isTarget) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#40e0d0';
        }
        
        ctx.restore();
    });
}

function drawCircle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawTriangle(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x - size / 2, y + size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawSquare(x, y, size) {
    const halfSize = size / 2;
    ctx.fillRect(x - halfSize, y - halfSize, size, size);
    ctx.strokeRect(x - halfSize, y - halfSize, size, size);
}

function drawRectangle(x, y, size) {
    const width = size * 1.5;
    const height = size;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.strokeRect(x - width / 2, y - height / 2, width, height);
}

// ============================================
// CLICK HANDLING
// ============================================

canvas.addEventListener('click', handleCanvasClick);

function handleCanvasClick(e) {
    if (!gameState.isRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check if click hit any shape
    for (let i = gameState.shapes.length - 1; i >= 0; i--) {
        const shape = gameState.shapes[i];
        
        if (isPointInShape(clickX, clickY, shape)) {
            handleShapeClick(shape);
            gameState.shapes.splice(i, 1);
            break;
        }
    }
}

function isPointInShape(x, y, shape) {
    const dx = x - shape.x;
    const dy = y - shape.y;
    const halfSize = shape.size / 2;
    
    switch (shape.type) {
        case 'circle':
            return Math.sqrt(dx * dx + dy * dy) <= halfSize;
        case 'triangle':
            // Simple triangle hit test
            return Math.abs(dx) < halfSize && dy > -halfSize && dy < halfSize;
        case 'square':
            return Math.abs(dx) < halfSize && Math.abs(dy) < halfSize;
        case 'rectangle':
            const width = shape.size * 1.5;
            return Math.abs(dx) < width / 2 && Math.abs(dy) < halfSize;
        default:
            return false;
    }
}

function handleShapeClick(shape) {
    const isCorrect = shape.type === gameState.targetShape;
    
    if (isCorrect) {
        // Correct shape clicked
        gameState.combo++;
        const points = Math.floor(config.correctShapePoints * Math.pow(config.comboMultiplier, gameState.combo - 1));
        gameState.score += points;
        
        // Increase power
        gameState.power = Math.min(gameState.power + config.correctShapePower, config.maxPower);
        
        // Visual feedback (you can add particle effects here)
        showFeedback('+ ' + points, '#40e0d0', shape.x, shape.y);
    } else {
        // Wrong shape clicked
        gameState.combo = 0;
        gameState.score = Math.max(0, gameState.score - config.wrongShapePenalty);
        
        // Decrease power
        gameState.power = Math.max(0, gameState.power - config.wrongShapePowerLoss);
        
        // Visual feedback
        showFeedback('- ' + config.wrongShapePenalty, '#ff6b6b', shape.x, shape.y);
    }
    
    updateUI();
}

function showFeedback(text, color, x, y) {
    // Simple text feedback (can be enhanced with animations)
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - 30);
    ctx.restore();
}

// ============================================
// TIMER
// ============================================

let timerInterval = null;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!gameState.isRunning) {
            clearInterval(timerInterval);
            return;
        }
        
        gameState.timeLeft--;
        updateUI();
        
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameState.isRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    
    // Show game over message
    setTimeout(() => {
        alert(`Game Over!\nFinal Score: ${gameState.score}\nFinal Combo: ${gameState.combo}x`);
        stopGame();
    }, 100);
}

// ============================================
// UI UPDATES
// ============================================

function updateUI() {
    // Update score
    document.getElementById('scoreDisplay').textContent = gameState.score;
    
    // Update timer
    document.getElementById('timerDisplay').textContent = gameState.timeLeft;
    
    // Update combo
    document.getElementById('comboDisplay').textContent = gameState.combo + 'x';
    
    // Update power meter
    const powerPercentage = (gameState.power / config.maxPower) * 100;
    document.getElementById('powerMeterFill').style.width = powerPercentage + '%';
}

// ============================================
// BACKGROUND DRAWING
// ============================================

function drawBackground() {
    // Draw subtle grid or pattern
    ctx.strokeStyle = 'rgba(64, 224, 208, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
}


