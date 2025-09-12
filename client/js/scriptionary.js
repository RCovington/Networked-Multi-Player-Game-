// Wait for the DOM to be fully loaded before running the game
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing Scriptionary game...');
    
    // Connect to the Socket.io server
    var socket = io(window.SERVER_CONFIG.SERVER_URL);
    
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
    
    function formatDefinition(definition) {
        // Trim whitespace
        definition = definition.trim();
        
        // Capitalize first letter
        if (definition.length > 0) {
            definition = definition.charAt(0).toUpperCase() + definition.slice(1);
        }
        
        // Add period at the end if it doesn't end with punctuation
        if (definition.length > 0 && !/[.!?]$/.test(definition)) {
            definition += '.';
        }
        
        return definition;
    }

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
        
        // Auto-format the definition for better presentation
        definition = formatDefinition(definition);
        
        socket.emit('scriptionary_submit_definition', { definition: definition });
        hasSubmitted = true;
        
        // Keep the countdown timer running for other players
        // Don't clear the timer here - let it continue counting down
        
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
        console.log('Connected to Scriptionary game server');
        
        // Get player name from localStorage (set by lobby)
        var playerName = localStorage.getItem('playerName');
        if (playerName) {
            console.log('Using stored player name:', playerName);
            socket.emit('join_scriptionary_game', { playerName: playerName });
        } else {
            console.log('No stored player name found');
            socket.emit('join_scriptionary_game');
        }
    });
    
    socket.on('scriptionary_round_start', function(data) {
        console.log('Scriptionary round started:', data);
        
        currentRound = data.round;
        hasSubmitted = false;
        hasVoted = false;
        
        // Only show round info if not the final round (Round 3)
        if (data.round < 3) {
            roundInfo.innerHTML = '<h3>Round ' + data.round + ' - Term: ' + data.word + ' <span style="font-size: 0.8em; color: #95a5a6;">' + data.category + '</span></h3>';
        } else {
            roundInfo.innerHTML = '<h3>Round ' + data.round + '</h3>';
        }
        wordDisplay.innerHTML = data.word + ' <span style="font-size: 0.75em; color: #95a5a6; font-weight: normal;">' + data.category + '</span>';
        
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
    
    socket.on('scriptionary_show_definitions', function(data) {
        console.log('Showing definitions for voting:', data);
        
        // Stop the countdown timer
        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        
        // Hide input section and timer
        wordSection.style.display = 'none';
        if (countdownElement) {
            countdownElement.style.display = 'none';
        }
        
        // Show definitions for voting
        definitionsSection.style.display = 'block';
        definitionsContainer.innerHTML = '';
        
        // Display the word and category during voting
        var votingWordDisplay = document.getElementById('votingWordDisplay');
        if (votingWordDisplay) {
            votingWordDisplay.innerHTML = wordDisplay.innerHTML; // Copy from the main word display
        }
        
        // Get current player's socket ID for comparison
        var currentPlayerId = socket.id;
        
        data.definitions.forEach(function(def, index) {
            console.log('Definition', index + 1, '- Player:', def.playerName, 'ID:', def.playerId, 'Definition:', def.definition);
            
            var defItem = document.createElement('div');
            defItem.className = 'definition-item';
            
            var defText = document.createElement('div');
            defText.className = 'definition-text';
            defText.textContent = (index + 1) + '. ' + def.definition;
            
            var voteBtn = document.createElement('button');
            voteBtn.className = 'vote-btn';
            
            // Check if this is the player's own definition
            if (def.playerId === currentPlayerId) {
                voteBtn.textContent = 'Your Definition';
                voteBtn.disabled = true;
                voteBtn.style.backgroundColor = '#7f8c8d';
                voteBtn.style.cursor = 'not-allowed';
            } else {
                voteBtn.textContent = 'Vote';
                voteBtn.onclick = function() {
                    voteForDefinition(def.playerId);
                };
            }
            
            defItem.appendChild(defText);
            defItem.appendChild(voteBtn);
            definitionsContainer.appendChild(defItem);
        });
        
        statusMessage.textContent = 'Vote for the definition you think is REAL!';
    });
    
    socket.on('scriptionary_round_results', function(data) {
        console.log('Scriptionary round results:', data);
        
        // Hide definitions section
        definitionsSection.style.display = 'none';
        
        // Show results
        resultsSection.style.display = 'block';
        
        var html = '<div class="results-header">';
        html += '<h2>Round ' + currentRound + ' Results</h2>';
        html += '</div>';
        
        // Show correct definition
        html += '<div class="correct-definition-section">';
        html += '<div class="section-header correct-header">Correct Definition</div>';
        html += '<div class="word-info">';
        html += '<div class="highlight-word">' + data.word + '</div>';
        html += '<div class="real-definition">' + data.correctDefinition + '</div>';
        html += '</div>';
        html += '</div>';
        
        // Show points awarded this round
        html += '<div class="points-section">';
        html += '<div class="section-header points-header">Points This Round</div>';
        
        data.playerScores.forEach(function(player) {
            var pointsThisRound = data.pointsAwarded[player.name] || 0;
            var reasons = data.pointReasons[player.name] || [];
            
            html += '<div class="player-points-card">';
            html += '<div class="player-name-prominent">' + player.name + '</div>';
            html += '<div class="points-earned">+' + pointsThisRound + ' points</div>';
            html += '<div class="total-score">Total: ' + player.score + ' points</div>';
            
            if (reasons.length > 0) {
                html += '<div class="points-reasons">';
                reasons.forEach(function(reason) {
                    html += '<div class="reason-item">• ' + reason + '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';
        
        // Show all player definitions
        html += '<div class="definitions-section">';
        html += '<div class="section-header definitions-header">Player Definitions</div>';
        
        data.playerScores.forEach(function(player) {
            var voteCount = data.voteCounts[player.name] || 0;
            
            html += '<div class="player-definition-card">';
            html += '<div class="player-name-prominent">' + player.name + '</div>';
            html += '<div class="definition-text">' + player.definition + '</div>';
            html += '<div class="votes-info">Received <span class="vote-count">' + voteCount + '</span> vote(s)</div>';
            html += '</div>';
        });
        html += '</div>';
        
        // Show total scores
        html += '<div class="total-scores-section">';
        html += '<div class="section-header total-scores-header">Current Standings</div>';
        
        // Sort players by score
        var sortedPlayers = data.playerScores.slice().sort(function(a, b) {
            return b.score - a.score;
        });
        
        sortedPlayers.forEach(function(player, index) {
            var position = index + 1;
            var positionText = position === 1 ? '1st' : position === 2 ? '2nd' : position === 3 ? '3rd' : position + 'th';
            
            html += '<div class="total-score-card">';
            html += '<div class="score-position">' + positionText + '</div>';
            html += '<div class="player-name-prominent">' + player.name + '</div>';
            html += '<div class="current-total-score">' + player.score + ' pts</div>';
            html += '</div>';
        });
        html += '</div>';
        
        resultsContainer.innerHTML = html;
        statusMessage.textContent = 'Next round starting soon...';
    });
    
    socket.on('scriptionary_game_over', function(data) {
        console.log('Scriptionary game over:', data);
        
        resultsSection.style.display = 'block';
        
        var html = '<div class="results-header">';
        html += '<h2>🎉 Game Over! 🎉</h2>';
        html += '<p>Final Results</p>';
        html += '</div>';
        
        html += '<div class="total-scores-section">';
        html += '<div class="section-header total-scores-header">Final Standings</div>';
        
        data.finalScores.forEach(function(player, index) {
            var position = index + 1;
            var positionText = position === 1 ? '🥇 Winner!' : position === 2 ? '🥈 2nd Place' : position === 3 ? '🥉 3rd Place' : position + 'th Place';
            
            html += '<div class="total-score-card">';
            html += '<div class="score-position">' + positionText + '</div>';
            html += '<div class="player-name-prominent">' + player.name + '</div>';
            html += '<div class="current-total-score">' + player.score + ' pts</div>';
            html += '</div>';
        });
        html += '</div>';
        
        html += '<div style="text-align: center; margin-top: 30px;">';
        html += '<button onclick="returnToLobby()" class="submit-btn">Return to Lobby</button>';
        html += '</div>';
        
        resultsContainer.innerHTML = html;
        statusMessage.textContent = 'Thanks for playing Scriptionary!';
    });
    
    socket.on('scriptionary_waiting', function(data) {
        statusMessage.textContent = 'Waiting for more players... (' + data.playerCount + ' connected)';
    });
    
    function voteForDefinition(definitionId) {
        if (hasVoted) return;
        
        console.log('Voting for definition ID:', definitionId);
        socket.emit('scriptionary_vote', { definitionId: definitionId });
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
    
    console.log('Scriptionary game initialization complete');
});
