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

var currentRound = 0;
var hasSubmitted = false;
var hasVoted = false;

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
        alert('Please enter a definition!');
        return;
    }
    
    if (definition.length < 5) {
        alert('Please enter a longer definition!');
        return;
    }
    
    socket.emit('fictionary_submit_definition', { definition: definition });
    hasSubmitted = true;
    
    // Hide input section and show waiting message
    wordSection.style.display = 'none';
    statusMessage.textContent = 'Definition submitted! Waiting for other players...';
    submitBtn.disabled = true;
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
    
    // Only show round info if not the final round (Round 3)
    if (data.round < 3) {
        roundInfo.innerHTML = '<h3>Round ' + data.round + ' - Word: ' + data.word + '</h3>';
    } else {
        roundInfo.innerHTML = '<h3>Round ' + data.round + '</h3>';
    }
    wordDisplay.textContent = data.word;
    
    // Show word input section
    wordSection.style.display = 'block';
    definitionsSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    definitionInput.value = '';
    definitionInput.focus();
    submitBtn.disabled = false;
    statusMessage.textContent = '';
});

socket.on('fictionary_show_definitions', function(data) {
    console.log('Showing definitions for voting:', data);
    
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

socket.on('fictionary_round_results', function(data) {
    console.log('Fictionary round results:', data);
    
    definitionsSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    var resultsHtml = '<h3>Round ' + currentRound + ' Results</h3>';
    resultsHtml += '<div class="score-display"><strong>Word:</strong> ' + data.word + '</div>';
    resultsHtml += '<div class="score-display"><strong>Real Definition:</strong> ' + data.realDefinition + '</div>';
    
    // Show scoring breakdown
    if (data.scoringBreakdown && data.scoringBreakdown.length > 0) {
        resultsHtml += '<h4>Points Awarded This Round:</h4>';
        data.scoringBreakdown.forEach(function(scoring) {
            resultsHtml += '<div class="score-display">';
            resultsHtml += '<strong>' + scoring.name + ':</strong> <span style="color: #f39c12; font-weight: bold; font-size: 200%;">+' + scoring.pointsThisRound + '</span> <span style="color: #f39c12; font-weight: bold;">points</span><br>';
            scoring.reasons.forEach(function(reason) {
                resultsHtml += '<em>• ' + reason + '</em><br>';
            });
            resultsHtml += '</div>';
        });
    }
    
    resultsHtml += '<h4>Player Definitions & Votes:</h4>';
    data.playerScores.forEach(function(player) {
        var votesReceived = data.voteCounts[player.name] || 0;
        resultsHtml += '<div class="score-display">';
        resultsHtml += '<strong>' + player.name + ':</strong> <span style="color: #27ae60; font-weight: bold; font-size: 200%;">' + player.score + '</span> <span style="color: #27ae60; font-weight: bold;">points total</span><br>';
        resultsHtml += '<em>Definition:</em> "' + player.definition + '"<br>';
        resultsHtml += '<em>Votes received:</em> ' + votesReceived;
        resultsHtml += '</div>';
    });
    
    resultsContainer.innerHTML = resultsHtml;
    
    if (currentRound < 3) {
        statusMessage.textContent = 'Next round starting soon...';
    } else {
        statusMessage.textContent = 'Game ending, calculating final scores...';
    }
});

socket.on('fictionary_game_over', function(data) {
    console.log('Fictionary game over:', data);
    
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
