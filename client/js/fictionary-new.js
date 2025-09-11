// Wait for the DOM to be fully loaded before running the game
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing game...');
    
    // Connect to the Socket.io server
    const config = require('./config');
    var socket = io(config.SERVER_URL);
    
    // Game state variables
    var currentRound = 0;
    var hasSubmitted = false;
    var hasVoted = false;
    var countdownTimer;
    var timeLeft = 45;
    
    // Get DOM elements
    console.log('Fetching DOM elements...');
    var roundInfo = document.getElementById('roundInfo');
    var wordSection = document.getElementById('wordSection');
    var wordDisplay = document.getElementById('wordDisplay');
    var definitionInput = document.getElementById('definitionInput');
    var submitBtn = document.getElementById('submitBtn');
    var definitionsSection = document.getElementById('definitionsSection');
    var definitionsContainer = document.getElementById('definitionsContainer');
    var resultsSection = document.getElementById('resultsSection');
    var resultsContainer = document.getElementById('resultsContainer');
    var statusMessage = document.getElementById('statusMessage');
    var countdownElement = document.getElementById('countdownTimer');
    
    // Debug timer element
    console.log('Timer element found:', countdownElement);
    if (!countdownElement) {
        console.error('ERROR: countdownTimer element not found in the DOM!');
    } else {
        console.log('Initial timer element styles:', {
            display: window.getComputedStyle(countdownElement).display,
            visibility: window.getComputedStyle(countdownElement).visibility,
            opacity: window.getComputedStyle(countdownElement).opacity
        });
        
        // Make sure timer is visible
        countdownElement.style.display = 'block';
        countdownElement.style.visibility = 'visible';
        countdownElement.textContent = 'Waiting for round to start...';
    }
    
    // Event listeners
    submitBtn.addEventListener('click', submitDefinition);
    definitionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitDefinition();
        }
    });
    
    function submitDefinition() {
        if (hasSubmitted) return;
        
        var definition = definitionInput.value.trim();
        if (!definition) {
            if (timeLeft <= 0) {
                definition = "I ran out of time to think of something clever!";
            } else {
                alert('Please enter a definition!');
                return;
            }
        }
        
        if (definition.length < 5) {
            if (timeLeft <= 0) {
                definition = definition.padEnd(5, '.');
            } else {
                alert('Please enter a longer definition!');
                return;
            }
        }
        
        socket.emit('fictionary_submit_definition', { definition: definition });
        hasSubmitted = true;
        
        // Stop the countdown timer
        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        
        // Hide input section and show waiting message
        wordSection.style.display = 'none';
        statusMessage.textContent = 'Definition submitted! Waiting for other players...';
        submitBtn.disabled = true;
    }
    
    function startCountdown() {
        console.log('Starting countdown function');
        
        // Clear any existing timer
        if (countdownTimer) {
            console.log('Clearing existing timer');
            clearInterval(countdownTimer);
        }
        
        // Reset time and display
        timeLeft = 45;
        updateCountdownDisplay();
        
        // Start countdown
        countdownTimer = setInterval(function() {
            timeLeft--;
            updateCountdownDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(countdownTimer);
                if (!hasSubmitted) {
                    submitDefinition();
                }
            }
        }, 1000);
    }
    
    function updateCountdownDisplay() {
        console.log('Updating timer to:', timeLeft);
        if (countdownElement) {
            countdownElement.textContent = timeLeft + ' seconds remaining';
            
            // Change color based on time remaining
            if (timeLeft <= 10) {
                countdownElement.style.color = '#e74c3c'; // Red when time is running out
            } else if (timeLeft <= 20) {
                countdownElement.style.color = '#f39c12'; // Orange when getting low
            } else {
                countdownElement.style.color = '#f39c12'; // Yellow otherwise
            }
        }
    }
    
    // Socket event listeners
    socket.on('connect', function() {
        console.log('Connected to Fictionary game server');
        
        // Get player name from localStorage (set by lobby)
        var playerName = localStorage.getItem('playerName');
        if (playerName) {
            console.log('Using stored player name:', playerName);
            socket.emit('join_fictionary_game', { playerName: playerName });
        } else {
            console.log('No stored player name found');
            socket.emit('join_fictionary_game');
        }
    });
    
    socket.on('fictionary_round_start', function(data) {
        console.log('Fictionary round started:', data);
        
        currentRound = data.round;
        hasSubmitted = false;
        hasVoted = false;
        
        // Only show round info if not the final round (Round 3)
        if (data.round < 3) {
            roundInfo.innerHTML = '<h3>Round ' + data.round + ' - Word: ' + data.word + '</h3>';
        } else {
            roundInfo.innerHTML = '<h3>Round ' + data.round + '</h3>';
        }
        wordDisplay.textContent = data.word;
        
        // Show word input section and ensure timer is visible
        wordSection.style.display = 'block';
        definitionsSection.style.display = 'none';
        resultsSection.style.display = 'none';
        
        // Ensure timer is visible and reset
        if (countdownElement) {
            countdownElement.style.display = 'block';
            countdownElement.style.visibility = 'visible';
            countdownElement.style.opacity = '1';
        }
        
        definitionInput.value = '';
        definitionInput.focus();
        submitBtn.disabled = false;
        statusMessage.textContent = '';
        
        // Start the countdown timer
        console.log('About to start countdown');
        startCountdown();
    });
    
    // Rest of your socket event listeners...
    socket.on('fictionary_show_definitions', function(data) {
        console.log('Showing definitions for voting:', data);
        
        // Stop the countdown timer
        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        
        // Hide input section
        wordSection.style.display = 'none';
        
        // Show definitions for voting
        definitionsSection.style.display = 'block';
        definitionsContainer.innerHTML = '';
        
        data.definitions.forEach(function(def, index) {
            console.log('Definition', index + 1, '- Player:', def.playerName, 'ID:', def.playerId, 'Definition:', def.definition);
            
            var defItem = document.createElement('div');
            defItem.className = 'definition-item';
            
            var defText = document.createElement('div');
            defText.className = 'definition-text';
            defText.textContent = (index + 1) + '. ' + def.definition;
            
            var voteBtn = document.createElement('button');
            voteBtn.className = 'vote-btn';
            voteBtn.textContent = 'Vote';
            voteBtn.onclick = function() {
                voteForDefinition(def.playerId);
            };
            
            defItem.appendChild(defText);
            defItem.appendChild(voteBtn);
            definitionsContainer.appendChild(defItem);
        });
        
        statusMessage.textContent = 'Vote for the definition you think is REAL!';
    });
    
    // ... rest of your socket event listeners ...
    
    function voteForDefinition(definitionId) {
        if (hasVoted) return;
        
        console.log('Voting for definition ID:', definitionId);
        socket.emit('fictionary_vote', { definitionId: definitionId });
        hasVoted = true;
        statusMessage.textContent = 'Vote submitted! Waiting for other players...';
        
        // Disable all vote buttons
        var voteButtons = document.querySelectorAll('.vote-btn');
        voteButtons.forEach(function(btn) {
            btn.disabled = true;
            btn.style.backgroundColor = '#7f8c8d';
        });
    }
    
    // Make returnToLobby globally available
    window.returnToLobby = function() {
        window.location.href = '/lobby';
    };
    
    console.log('Game initialization complete');
});
