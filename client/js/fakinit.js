// Connect to the Socket.io server
// Using global SERVER_CONFIG from config.js
var socket = io(SERVER_CONFIG.SERVER_URL);

// Get DOM elements
var roundInfo = document.getElementById('roundInfo');
var promptSection = document.getElementById('promptSection');
var fakerSection = document.getElementById('fakerSection');
var promptText = document.getElementById('promptText');
var answerInput = document.getElementById('answerInput');
var submitBtn = document.getElementById('submitBtn');
var fakerAnswerInput = document.getElementById('fakerAnswerInput');
var fakerSubmitBtn = document.getElementById('fakerSubmitBtn');
var playersAnswers = document.getElementById('playersAnswers');
var answersContainer = document.getElementById('answersContainer');
var statusMessage = document.getElementById('statusMessage');

var currentRound = 0;
var isFaker = false;
var hasSubmitted = false;

// Event listeners
submitBtn.addEventListener('click', function() {
    submitAnswer();
});

fakerSubmitBtn.addEventListener('click', function() {
    submitAnswer();
});

answerInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

fakerAnswerInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

function submitAnswer() {
    if (hasSubmitted) return;
    
    var answer = isFaker ? fakerAnswerInput.value.trim() : answerInput.value.trim();
    if (!answer) {
        alert('Please enter an answer!');
        return;
    }
    
    socket.emit('fakinit_submit_answer', { answer: answer });
    hasSubmitted = true;
    
    // Hide input sections and show waiting message
    promptSection.style.display = 'none';
    fakerSection.style.display = 'none';
    statusMessage.textContent = 'Answer submitted! Waiting for other players...';
}

// Socket event listeners
socket.on('connect', function() {
    console.log('Connected to Fakin\' It game server');
    // Auto-join the Fakin' It game when connecting from fakinit.html
    socket.emit('join_fakinit_game');
});

socket.on('fakinit_round_start', function(data) {
    console.log('Round started:', data);
    
    currentRound = data.round;
    isFaker = data.isFaker;
    hasSubmitted = false;
    
    roundInfo.innerHTML = '<h3>Round ' + data.round + '</h3>';
    
    if (data.isFaker) {
        // Show faker interface
        fakerSection.style.display = 'block';
        promptSection.style.display = 'none';
        fakerAnswerInput.value = '';
        fakerAnswerInput.focus();
    } else {
        // Show normal prompt interface
        promptSection.style.display = 'block';
        fakerSection.style.display = 'none';
        promptText.textContent = data.prompt;
        answerInput.value = '';
        answerInput.focus();
    }
    
    playersAnswers.style.display = 'none';
    statusMessage.textContent = '';
});

socket.on('fakinit_show_answers', function(data) {
    console.log('Showing answers for voting:', data);
    
    // Hide input sections
    promptSection.style.display = 'none';
    fakerSection.style.display = 'none';
    
    // Show answers for voting
    playersAnswers.style.display = 'block';
    answersContainer.innerHTML = '';
    
    data.answers.forEach(function(answerData) {
        var answerItem = document.createElement('div');
        answerItem.className = 'answer-item';
        
        var answerText = document.createElement('span');
        answerText.textContent = answerData.playerName + ': "' + answerData.answer + '"';
        
        var voteBtn = document.createElement('button');
        voteBtn.className = 'vote-btn';
        voteBtn.textContent = 'Vote Faker';
        voteBtn.onclick = function() {
            voteForFaker(answerData.playerId);
        };
        
        answerItem.appendChild(answerText);
        answerItem.appendChild(voteBtn);
        answersContainer.appendChild(answerItem);
    });
    
    statusMessage.textContent = 'Vote for who you think is the faker!';
});

socket.on('fakinit_round_results', function(data) {
    console.log('Round results:', data);
    
    playersAnswers.style.display = 'none';
    
    var resultText = '';
    if (data.fakerCaught) {
        resultText = '🎉 The faker was caught! It was ' + data.fakerName + '!';
    } else {
        resultText = '😈 The faker ' + data.fakerName + ' fooled everyone!';
    }
    
    statusMessage.innerHTML = '<h3>' + resultText + '</h3><p>Next round starting soon...</p>';
});

socket.on('fakinit_game_over', function(data) {
    console.log('Game over:', data);
    
    playersAnswers.style.display = 'none';
    
    var scoresHtml = '<h2>🏆 Final Scores 🏆</h2>';
    data.scores.forEach(function(player, index) {
        var medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        
        scoresHtml += '<div style="margin: 10px 0; font-size: 18px;">' + 
                     medal + ' ' + player.name + ': ' + player.score + ' points</div>';
    });
    
    scoresHtml += '<br><button onclick="returnToLobby()" style="padding: 10px 20px; font-size: 16px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Return to Lobby</button>';
    
    statusMessage.innerHTML = scoresHtml;
});

function returnToLobby() {
    window.location.href = 'index.html';
}

function voteForFaker(playerId) {
    socket.emit('fakinit_vote', { suspectedFaker: playerId });
    statusMessage.textContent = 'Vote submitted! Waiting for other players...';
    
    // Disable all vote buttons
    var voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(function(btn) {
        btn.disabled = true;
        btn.style.backgroundColor = '#7f8c8d';
    });
}
