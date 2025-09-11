// Connect to the Socket.io server
// Using global SERVER_CONFIG from config.js
var socket = io(SERVER_CONFIG.SERVER_URL);

// Get DOM elements
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

var currentRound = 0;
var hasSubmitted = false;
var hasVoted = false;
var countdownTimer;
var timeLeft = 45;

// Event listeners
submitBtn.addEventListener('click', function() {
    submitDefinition();
});

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
    
    // Keep the countdown timer running - don't stop it
    // Timer will continue until all players submit or time expires
    
    // Hide input section and show waiting message
    wordSection.style.display = 'none';
    statusMessage.textContent = 'Definition submitted! Waiting for other players...';
    submitBtn.disabled = true;
}

function startCountdown() {
    // Clear any existing timer
    if (countdownTimer) {
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
    if (countdownElement) {
        countdownElement.textContent = timeLeft + ' seconds remaining';
        
        // Change color based on time remaining
        if (timeLeft <= 10) {
            countdownElement.style.color = '#e74c3c'; // Red when time is running out
            countdownElement.style.borderColor = '#e74c3c';
        } else if (timeLeft <= 20) {
            countdownElement.style.color = '#f39c12'; // Orange when getting low
            countdownElement.style.borderColor = '#f39c12';
        } else {
            countdownElement.style.color = '#f39c12'; // Yellow otherwise
            countdownElement.style.borderColor = '#f39c12';
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
        // Send player name when joining the game
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
    
    // Show just the round number (word is displayed prominently below)
    roundInfo.innerHTML = '<h3>Round ' + data.round + '</h3>';
    wordDisplay.textContent = data.word;
    
    // Show word input section
    wordSection.style.display = 'block';
    definitionsSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // Ensure timer is visible
    if (countdownElement) {
        countdownElement.style.display = 'block';
    }
    
    definitionInput.value = '';
    definitionInput.focus();
    submitBtn.disabled = false;
    statusMessage.textContent = '';
    
    // Start the countdown timer
    startCountdown();
});

socket.on('fictionary_show_definitions', function(data) {
    console.log('Showing definitions for voting:', data);
    
    // Stop the countdown timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    // Hide countdown timer during voting phase
    if (countdownElement) {
        countdownElement.style.display = 'none';
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
        
        defItem.appendChild(defText);
        
        // Only add vote button if this is not the current player's definition
        if (def.playerId !== socket.id) {
            var voteBtn = document.createElement('button');
            voteBtn.className = 'vote-btn';
            voteBtn.textContent = 'Vote';
            voteBtn.onclick = function() {
                voteForDefinition(def.playerId);
            };
            defItem.appendChild(voteBtn);
        } else {
            // Add a label to indicate this is the player's own definition
            var ownDefLabel = document.createElement('div');
            ownDefLabel.className = 'own-definition-label';
            ownDefLabel.textContent = 'Your Definition';
            ownDefLabel.style.color = '#f39c12';
            ownDefLabel.style.fontStyle = 'italic';
            ownDefLabel.style.fontSize = '14px';
            ownDefLabel.style.marginLeft = '15px';
            defItem.appendChild(ownDefLabel);
        }
        
        definitionsContainer.appendChild(defItem);
    });
    
    statusMessage.textContent = 'Vote for the definition you think is REAL!';
});

socket.on('fictionary_round_results', function(data) {
    console.log('Fictionary round results:', data);
    
    // Hide countdown timer during results phase
    if (countdownElement) {
        countdownElement.style.display = 'none';
    }
    
    definitionsSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    var resultsHtml = '<div class="results-header"><h3>Round ' + currentRound + ' Results</h3></div>';
    
    // Correct Definition Section
    resultsHtml += '<div class="correct-definition-section">';
    resultsHtml += '<h4 class="section-header correct-header">📖 Correct Answer</h4>';
    resultsHtml += '<div class="word-info"><strong>Word:</strong> <span class="highlight-word">' + data.word + '</span></div>';
    resultsHtml += '<div class="definition-info"><strong>Real Definition:</strong> <span class="real-definition">' + data.realDefinition + '</span></div>';
    resultsHtml += '</div>';
    
    // Points Awarded Section
    if (data.scoringBreakdown && data.scoringBreakdown.length > 0) {
        resultsHtml += '<div class="points-section">';
        resultsHtml += '<h4 class="section-header points-header">🏆 Points Awarded This Round</h4>';
        data.scoringBreakdown.forEach(function(scoring) {
            resultsHtml += '<div class="player-points-card">';
            resultsHtml += '<div class="player-name-prominent">' + scoring.name + '</div>';
            resultsHtml += '<div class="points-earned">+' + scoring.pointsThisRound + ' points</div>';
            resultsHtml += '<div class="points-reasons">';
            scoring.reasons.forEach(function(reason) {
                resultsHtml += '<div class="reason-item">• ' + reason + '</div>';
            });
            resultsHtml += '</div>';
            resultsHtml += '</div>';
        });
        resultsHtml += '</div>';
    }
    
    // Player Definitions Section
    resultsHtml += '<div class="definitions-section">';
    resultsHtml += '<h4 class="section-header definitions-header">📝 Player Definitions & Votes</h4>';
    data.playerScores.forEach(function(player) {
        var votesReceived = data.voteCounts[player.name] || 0;
        resultsHtml += '<div class="player-definition-card">';
        resultsHtml += '<div class="player-name-prominent">' + player.name + '</div>';
        resultsHtml += '<div class="total-score">' + player.score + ' points total</div>';
        resultsHtml += '<div class="definition-text">"' + player.definition + '"</div>';
        resultsHtml += '<div class="votes-info">Votes received: <span class="vote-count">' + votesReceived + '</span></div>';
        resultsHtml += '</div>';
    });
    resultsHtml += '</div>';
    
    // Current Total Scores Section
    resultsHtml += '<div class="total-scores-section">';
    resultsHtml += '<h4 class="section-header total-scores-header">📊 Current Total Scores</h4>';
    
    // Sort players by total score for leaderboard display
    var sortedPlayers = data.playerScores.slice().sort(function(a, b) {
        return b.score - a.score;
    });
    
    sortedPlayers.forEach(function(player, index) {
        var position = index + 1;
        var medal = '';
        if (position === 1) medal = '🥇 ';
        else if (position === 2) medal = '🥈 ';
        else if (position === 3) medal = '🥉 ';
        
        resultsHtml += '<div class="total-score-card">';
        resultsHtml += '<div class="score-position">' + medal + '#' + position + '</div>';
        resultsHtml += '<div class="player-name-prominent">' + player.name + '</div>';
        resultsHtml += '<div class="current-total-score">' + player.score + ' points</div>';
        resultsHtml += '</div>';
    });
    resultsHtml += '</div>';
    
    resultsContainer.innerHTML = resultsHtml;
    
    if (currentRound < 3) {
        statusMessage.textContent = 'Next round starting soon...';
    } else {
        statusMessage.textContent = 'Game ending, calculating final scores...';
    }
});

socket.on('fictionary_game_over', function(data) {
    console.log('Fictionary game over:', data);
    
    // Hide countdown timer during game over phase
    if (countdownElement) {
        countdownElement.style.display = 'none';
    }
    
    definitionsSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    var scoresHtml = '<h2>🏆 Final Scores 🏆</h2>';
    data.scores.forEach(function(player, index) {
        var medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        scoresHtml += '<div class="score-display" style="font-size: 18px;">' + 
                     medal + ' ' + player.name + ': ' + player.score + ' points</div>';
    });
    
    scoresHtml += '<br><button onclick="returnToLobby()" style="padding: 15px 30px; font-size: 16px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Return to Lobby</button>';
    
    resultsContainer.innerHTML = scoresHtml;
    statusMessage.textContent = '';
});

function voteForDefinition(definitionId) {
    if (hasVoted) return;
    
    console.log('Client voting for definition ID:', definitionId, '(type:', typeof definitionId, ')');
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

function returnToLobby() {
    window.location.href = 'index.html';
}
