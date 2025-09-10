// Pac-Man multiplayer game client
var socket = io('http://127.0.0.1:3513');

// Game elements
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var playerScore = document.getElementById('playerScore');
var pelletsLeft = document.getElementById('pelletsLeft');
var playerCount = document.getElementById('playerCount');
var playersContainer = document.getElementById('playersContainer');

// Game state
var gameState = {
    players: {},
    pellets: [],
    ghosts: [],
    maze: [],
    myPlayerId: null,
    score: 0,
    gameActive: false
};

// Game constants
var TILE_SIZE = 20;
var MAZE_WIDTH = 30;
var MAZE_HEIGHT = 40;

// Player colors for multiplayer
var PLAYER_COLORS = ['#ffff00', '#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff'];

// Animation variables
var animationFrame = 0;
var lastAnimationTime = 0;

// Socket event listeners
socket.on('connect', function() {
    console.log('Connected to server');
    
    // Setup touch controls
    setupTouchControls();
    
    // Get player name from localStorage (set during lobby transition)
    var playerName = localStorage.getItem('playerName');
    if (playerName) {
        console.log('Using stored player name:', playerName);
        socket.emit('join_pacman_game', { playerName: playerName });
    } else {
        console.log('No stored player name found');
        socket.emit('join_pacman_game');
    }
});

socket.on('pacman_game_state', function(data) {
    console.log('Received game state:', data);
    // Preserve myPlayerId when updating game state
    var savedPlayerId = gameState.myPlayerId;
    gameState.players = data.players;
    gameState.pellets = data.pellets;
    gameState.ghosts = data.ghosts;
    gameState.maze = data.maze;
    gameState.gameActive = true;
    gameState.myPlayerId = savedPlayerId; // Restore player ID
    console.log('Game is now active, myPlayerId:', gameState.myPlayerId);
    updateUI();
    drawGame();
});

socket.on('pacman_player_update', function(data) {
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].x = data.x;
        gameState.players[data.playerId].y = data.y;
        gameState.players[data.playerId].direction = data.direction;
        drawGame();
    }
});

socket.on('pacman_pellet_collected', function(data) {
    // Remove pellet from game state
    gameState.pellets = gameState.pellets.filter(function(pellet) {
        return !(pellet.x === data.x && pellet.y === data.y);
    });
    
    // Update player score
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].score = data.score;
    }
    
    updateUI();
    drawGame();
});

socket.on('pacman_ghost_update', function(data) {
    gameState.ghosts = data.ghosts;
    drawGame();
});

socket.on('pacman_player_died', function(data) {
    // Update player position and score after death
    if (gameState.players[data.playerId]) {
        gameState.players[data.playerId].x = data.x;
        gameState.players[data.playerId].y = data.y;
        gameState.players[data.playerId].score = data.score;
    }
    
    // Show death message if it's the current player
    if (data.playerId === gameState.myPlayerId) {
        alert('You were caught by a ghost! -50 points');
    }
    
    updateUI();
    drawGame();
});

socket.on('pacman_game_over', function(data) {
    gameState.gameActive = false;
    alert('Game Over! Final Scores:\n' + 
          data.scores.map(function(player, index) {
              return (index + 1) + '. ' + player.name + ': ' + player.score + ' points';
          }).join('\n'));
});

// Input handling
var keys = {};
document.addEventListener('keydown', function(e) {
    console.log('Key pressed:', e.key);
    keys[e.key] = true;
    handleInput();
    e.preventDefault(); // Prevent default browser behavior
});

document.addEventListener('keyup', function(e) {
    keys[e.key] = false;
});

function handleInput() {
    console.log('handleInput called, gameActive:', gameState.gameActive, 'myPlayerId:', gameState.myPlayerId);
    if (!gameState.gameActive || !gameState.myPlayerId) return;
    
    var direction = null;
    
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        direction = 'up';
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        direction = 'down';
    } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        direction = 'left';
    } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        direction = 'right';
    }
    
    if (direction) {
        console.log('Sending move:', direction);
        socket.emit('pacman_move', { direction: direction });
    }
}

// Drawing functions
function drawGame() {
    if (!gameState.gameActive) return;
    
    // Update animation frame
    var currentTime = Date.now();
    if (currentTime - lastAnimationTime > 100) { // Update every 100ms
        animationFrame++;
        lastAnimationTime = currentTime;
    }
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw maze walls
    ctx.fillStyle = '#0000ff';
    gameState.maze.forEach(function(wall) {
        ctx.fillRect(wall.x * TILE_SIZE, wall.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    
    // Draw pellets
    ctx.fillStyle = '#ffff00';
    gameState.pellets.forEach(function(pellet) {
        ctx.beginPath();
        ctx.arc(
            pellet.x * TILE_SIZE + TILE_SIZE/2, 
            pellet.y * TILE_SIZE + TILE_SIZE/2, 
            3, 0, 2 * Math.PI
        );
        ctx.fill();
    });
    
    // Draw players with animated mouths
    Object.keys(gameState.players).forEach(function(playerId, index) {
        var player = gameState.players[playerId];
        var color = PLAYER_COLORS[index % PLAYER_COLORS.length];
        
        var centerX = player.x * TILE_SIZE + TILE_SIZE / 2;
        var centerY = player.y * TILE_SIZE + TILE_SIZE / 2;
        var radius = TILE_SIZE / 2 - 2;
        
        // Calculate mouth animation
        var mouthOpen = Math.sin(animationFrame * 0.3) > 0;
        var mouthAngle = mouthOpen ? Math.PI * 0.6 : 0; // 60 degrees when open
        
        // Determine mouth direction based on player direction
        var startAngle = 0;
        var endAngle = 2 * Math.PI - mouthAngle;
        
        switch(player.direction) {
            case 'right':
                startAngle = mouthAngle / 2;
                endAngle = 2 * Math.PI - mouthAngle / 2;
                break;
            case 'left':
                startAngle = Math.PI - mouthAngle / 2;
                endAngle = Math.PI + mouthAngle / 2;
                break;
            case 'up':
                startAngle = Math.PI * 1.5 - mouthAngle / 2;
                endAngle = Math.PI * 1.5 + mouthAngle / 2;
                break;
            case 'down':
                startAngle = Math.PI * 0.5 - mouthAngle / 2;
                endAngle = Math.PI * 0.5 + mouthAngle / 2;
                break;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        if (mouthOpen) {
            ctx.lineTo(centerX, centerY);
        }
        ctx.fill();
    });
    
    // Draw ghosts with classic ghost appearance and animation
    gameState.ghosts.forEach(function(ghost, index) {
        var centerX = ghost.x * TILE_SIZE + TILE_SIZE / 2;
        var centerY = ghost.y * TILE_SIZE + TILE_SIZE / 2;
        var ghostRadius = TILE_SIZE / 2 - 2;
        
        // Different colors for each ghost
        var ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
        ctx.fillStyle = ghostColors[index % ghostColors.length];
        
        // Draw ghost body (rounded top, flat bottom with wavy edge)
        ctx.beginPath();
        
        // Top semicircle
        ctx.arc(centerX, centerY - 2, ghostRadius, Math.PI, 0, false);
        
        // Sides going down
        ctx.lineTo(centerX + ghostRadius, centerY + ghostRadius - 2);
        
        // Animated wavy bottom edge
        var waveOffset = Math.sin(animationFrame * 0.2 + index) * 2;
        var wavePoints = 6;
        for (var i = 0; i <= wavePoints; i++) {
            var waveX = centerX + ghostRadius - (i * (ghostRadius * 2) / wavePoints);
            var waveY = centerY + ghostRadius - 2;
            
            if (i % 2 === 0) {
                waveY += 3 + waveOffset;
            } else {
                waveY -= 1 + waveOffset;
            }
            
            ctx.lineTo(waveX, waveY);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#ffffff';
        var eyeRadius = 3;
        var eyeOffsetX = 4;
        var eyeOffsetY = -4;
        
        // Left eye
        ctx.beginPath();
        ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, eyeRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Eye pupils (animated to look in movement direction)
        ctx.fillStyle = '#000000';
        var pupilRadius = 1.5;
        var pupilOffsetX = 0;
        var pupilOffsetY = 0;
        
        // Animate pupils based on ghost direction
        if (ghost.direction) {
            switch(ghost.direction) {
                case 'left': pupilOffsetX = -1; break;
                case 'right': pupilOffsetX = 1; break;
                case 'up': pupilOffsetY = -1; break;
                case 'down': pupilOffsetY = 1; break;
            }
        }
        
        // Left pupil
        ctx.beginPath();
        ctx.arc(centerX - eyeOffsetX + pupilOffsetX, centerY + eyeOffsetY + pupilOffsetY, pupilRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Right pupil
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX + pupilOffsetX, centerY + eyeOffsetY + pupilOffsetY, pupilRadius, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function updateUI() {
    var myPlayer = gameState.players[gameState.myPlayerId];
    if (myPlayer) {
        playerScore.textContent = myPlayer.score;
    }
    
    pelletsLeft.textContent = gameState.pellets.length;
    playerCount.textContent = Object.keys(gameState.players).length;
    
    // Update players list
    var playersHtml = '';
    Object.keys(gameState.players).forEach(function(playerId, index) {
        var player = gameState.players[playerId];
        var color = PLAYER_COLORS[index % PLAYER_COLORS.length];
        playersHtml += '<div class="player-item" style="border-left: 4px solid ' + color + ';">';
        playersHtml += player.name + ': ' + player.score + ' points';
        playersHtml += '</div>';
    });
    playersContainer.innerHTML = playersHtml;
}

// Touch control functions
function setupTouchControls() {
    document.getElementById('up-btn').addEventListener('click', function() {
        sendMove('up');
    });
    
    document.getElementById('down-btn').addEventListener('click', function() {
        sendMove('down');
    });
    
    document.getElementById('left-btn').addEventListener('click', function() {
        sendMove('left');
    });
    
    document.getElementById('right-btn').addEventListener('click', function() {
        sendMove('right');
    });
    
    // Prevent button focus on mobile
    var buttons = document.querySelectorAll('.arrow-btn');
    buttons.forEach(function(btn) {
        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
        });
    });
}

function sendMove(direction) {
    if (!gameState.gameActive || !gameState.myPlayerId) return;
    
    console.log('Sending move:', direction);
    socket.emit('pacman_move', { direction: direction });
}

// Start continuous animation loop
function gameLoop() {
    if (gameState.gameActive) {
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}
gameLoop();

// Return to lobby function
function returnToLobby() {
    window.location.href = 'index.html';
}

// Initialize game when page loads
socket.on('pacman_player_joined', function(data) {
    gameState.myPlayerId = data.playerId;
    console.log('Joined as player:', data.playerId);
    console.log('Player ID set, can now accept input');
});
