// Connect to the Socket.io server
// Using global SERVER_CONFIG from config.js
var socket = io(SERVER_CONFIG.SERVER_URL);

// Get DOM elements
var playerNameInput = document.getElementById('playerNameInput');
var joinLobbyBtn = document.getElementById('joinLobbyBtn');
var readySection = document.getElementById('readySection');
var readyCheckbox = document.getElementById('readyCheckbox');
var gameSelect = document.getElementById('gameSelect');
var startGameSection = document.getElementById('startGameSection');
var startGameBtn = document.getElementById('startGameBtn');
var playersList = document.getElementById('playersList');
var playersContainer = document.getElementById('playersContainer');
var errorMessage = document.getElementById('errorMessage');

var isInLobby = false;

// Pre-populate name input with stored name on page load
window.addEventListener('DOMContentLoaded', function() {
    var storedName = localStorage.getItem('playerName');
    if (storedName) {
        playerNameInput.value = storedName;
    }
});

// Event listeners for UI elements
joinLobbyBtn.addEventListener('click', function() {
    var playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        showError('Please enter a name');
        return;
    }
    
    if (playerName.length > 12) {
        showError('Name must be 12 characters or less');
        return;
    }
    
    // Store player name in localStorage for future use
    localStorage.setItem('playerName', playerName);
    
    // Set player name and join lobby
    socket.emit('set_player_name', { name: playerName });
    socket.emit('join_lobby');
});

readyCheckbox.addEventListener('change', function() {
    if (isInLobby) {
        socket.emit('toggle_ready');
    }
});

gameSelect.addEventListener('change', function() {
    if (isInLobby && gameSelect.value) {
        socket.emit('select_game', { game: gameSelect.value });
    }
});

startGameBtn.addEventListener('click', function() {
    if (isInLobby) {
        socket.emit('start_game');
    }
});

// Allow Enter key to join lobby
playerNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        joinLobbyBtn.click();
    }
});

// Socket event listeners
socket.on('connect', function() {
    console.log('Connected to server');
});

socket.on('disconnect', function() {
    console.log('Disconnected from server');
    showError('Disconnected from server');
    resetLobbyUI();
});

socket.on('lobby_joined', function(lobbyData) {
    console.log('Successfully joined lobby');
    isInLobby = true;
    
    // Hide name input section and show lobby UI
    document.querySelector('.name-section').style.display = 'none';
    readySection.style.display = 'block';
    playersList.style.display = 'block';
    
    // Update players list
    updatePlayersList(lobbyData);
});

socket.on('lobby_update', function(lobbyData) {
    console.log('Lobby updated');
    updatePlayersList(lobbyData);
    checkStartGameVisibility(lobbyData);
});

socket.on('game_starting', function() {
    console.log('Game is starting!');
    alert('Game is starting!');
});

socket.on('transition_to_sprites', function() {
    console.log('Transitioning to sprites game...');
    // Redirect to sprites game page
    window.location.href = 'sprites.html';
});

socket.on('transition_to_fakinit', function() {
    console.log('Transitioning to Fakin\' It game...');
    // Redirect to Fakin' It game page
    window.location.href = 'fakinit.html';
});

socket.on('transition_to_fictionary', function() {
    console.log('Transitioning to Fictionary game');
    // Store player name in localStorage for the Fictionary game
    localStorage.setItem('playerName', playerNameInput.value);
    window.location.href = 'fictionary.html';
});

socket.on('transition_to_scriptionary', function() {
    console.log('Transitioning to Scriptionary game');
    // Store player name in localStorage for the Scriptionary game
    localStorage.setItem('playerName', playerNameInput.value);
    window.location.href = 'scriptionary.html';
});

socket.on('transition_to_pacman', function() {
    console.log('Transitioning to Pac-Man game');
    // Store player name in localStorage for the Pac-Man game
    localStorage.setItem('playerName', playerNameInput.value);
    window.location.href = 'pacman.html';
});

// Helper functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(function() {
        errorMessage.style.display = 'none';
    }, 3000);
}

function updatePlayersList(lobbyData) {
    playersContainer.innerHTML = '';
    
    if (lobbyData.length === 0) {
        playersContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No players in lobby</p>';
        return;
    }
    
    lobbyData.forEach(function(player) {
        var playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        var playerInfo = document.createElement('div');
        
        var playerName = document.createElement('span');
        playerName.className = 'player-name';
        playerName.textContent = player.name;
        playerInfo.appendChild(playerName);
        
        if (player.selectedGame) {
            var gameInfo = document.createElement('span');
            gameInfo.className = 'player-game';
            gameInfo.textContent = '(' + player.selectedGame + ')';
            playerInfo.appendChild(gameInfo);
        }
        
        var playerStatus = document.createElement('span');
        playerStatus.className = 'player-status ' + (player.isReady ? 'status-ready' : 'status-not-ready');
        playerStatus.textContent = player.isReady ? 'READY' : 'NOT READY';
        
        playerItem.appendChild(playerInfo);
        playerItem.appendChild(playerStatus);
        playersContainer.appendChild(playerItem);
    });
}

function checkStartGameVisibility(lobbyData) {
    if (lobbyData.length === 0) {
        startGameSection.style.display = 'none';
        return;
    }
    
    var allReady = true;
    for (var i = 0; i < lobbyData.length; i++) {
        if (!lobbyData[i].isReady) {
            allReady = false;
            break;
        }
    }
    
    if (allReady) {
        startGameSection.style.display = 'block';
    } else {
        startGameSection.style.display = 'none';
    }
}

function resetLobbyUI() {
    isInLobby = false;
    document.querySelector('.name-section').style.display = 'block';
    readySection.style.display = 'none';
    playersList.style.display = 'none';
    readyCheckbox.checked = false;
    // Don't clear the player name - keep it for convenience
}

// Remove the old socket event listeners that are no longer needed
socket.on('hello_client', function(data) {
    console.log('Server says hello:', data);
});

socket.on('how_are_you', function() {
    console.log('Server asks how are you');
});

socket.on('good_to_hear', function() {
    console.log('Server is glad to hear from us');
});
