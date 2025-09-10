/** Simple, easy, networked multiplayer game template using Socket.io and Phaser.io, with lots of explanations.
 * By Johnathan Fisher http://www.waywardworlds.com @waywardworlds
 *
 *  *   *   *   *   *   *   *   *   *   *   *   *   *   *
 *  *   *   *   How to set up the project   *   *   *   *
 *  *   *   *   *   *   *   *   *   *   *   *   *   *   *
 *
 * First, you need to have NodeJS and NPM installed. That should be fairly easy to do.
 * Open a command-line user interface (CLI), and enter 'node -v', then 'npm -v', which
 * should show the versions of Node and NPM if they are set up correctly, which should
 * output something like 'v5.10.0' and '4.4.4', or whatever version you installed.
 *
 * This project uses the Express.js and Socket.io libraries.
 * Everything that is required should be included in the package.json file. Just navigate to
 * the parent directory of your game, i.e. 'C:\path\to\basic-multiplayer-template' in a CLI
 * and enter 'npm install'.
 * This should go through everything listed in the package.json file and install them from NPM.
 *
 * There should now be a folder in your game directory called 'node_modules'.
 * It will be huge and full of junk and looks like a mess, but that's just how NPM is...
 *
 * This file is Server.js, which is what you should run with Node.
 * Assuming you are still in the directory of your game in the command line, enter
 * 'node server'. That will run this javascript file and set everything up that is in here.
 *
 * Below is the code and how it works.
 * */

// Strict mode helps to prevent the use of weird things that you might do in javascript by accident.
"use strict";

// Gathering dependencies. The require(...) bit imports the stuff that was installed through npm.
var express = require('express');
// Create an Express app. Socket.io just sits on top of Express, but Express itself isn't
// used much, unless you want to serve files with it, but that is not recommended.
var app = express();
// Make a new HTTP server from Express. This doesn't get used itself either, unless you want to do stuff with it.
var server = require('http').Server(app);
// This is where Socket.io is set up. Socket takes in the HTTP server created above, and basically adds it's own
// layer on top of it that is nice and easy to use. 'io' is the Socket.io server object. You could call it
// 'socketIOServer' or something similar if you wish, but all of the documentation for Socket.io uses just 'io'.
var io = require('socket.io')(server);

// What port and IP address to bind the server to. The port number can be any valid public port number (Google it if not sure).
// The port is used to direct network traffic arriving at your computer to a particular service, in this case
// the HTTP server that was created, so anything arriving on port 3512 will go to the HTTP server.

// There is a chance that the port you want to use is already being occupied by another
// process, so something to watch out for if you can't start the server.

// Defining route handlers
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use(express.static(__dirname + '/client'));

// Your IP address is how other devices on a network find this one. The 127.0.0.1 is known as a loop-back address, or
// otherwise known as 'localhost', which is basically a way for a device to send messages to itself.
server.listen(3513, "127.0.0.1");
console.log("Server started on http://127.0.0.1:3513");


// Used to manage players in the lobby. Each player has a name and ready status.
var lobbyPlayers = {};

// Used to manage players in the sprite game
var players = {};

// Used to manage Fakin' It game state
var fakinItGame = {
    players: {},
    votes: {},
    round: 0,
    gameActive: false,
    faker: null,
    currentPrompt: null
};

// Fictionary game state
var fictionaryGame = {
    players: {},
    playerNames: [],
    votes: {},
    definitions: {},
    round: 0,
    gameActive: false,
    currentWord: null,
    currentRealDefinition: null,
    waitingForPlayers: false
};

/** *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *
 *  *   *   * Some useful stuff you can do with Socket.io   *   *   *   *
 *  *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *
 *
 *  socket.on('event_name', function(optionalData){ ... );  - Adds an event listener to this socket.
 *  io.emit('event_name', optionalData);                    - Sends an event to all sockets.
 *  socket.emit('event_name', optionalData);                - Sends an event to this socket.
 *  socket.broadcast.emit('event_name', optionalData);      - Sends an event to all sockets except this one.
 *  io.in('room-name').emit('event_name', optionalData);    - Sends an event to all sockets that are in the specified room.
 *  socket.join('room-name');                               - Adds a socket to a room.
 *  socket.leave('room-name');                              - Removes a socket from a room.
*/

// A 'socket' it just an object that manages a client's connection to the server. For each client that connects to
// this server, they will get their own socket object. These socket objects are stored internally on the io object,
// and can be accessed manually with 'io.sockets' to get a list of the connected sockets, but you shouldn't really need to.

// The first time a connection is made with a new socket (a client), the 'connection' event is triggered
// on io (the Socket.io server object), and it runs the 'connection' callback function (the 'function(socket){ ... }' part).
// The socket object for the client that connected is sent to the callback, and this allows us to do stuff with that
// socket, such as adding event listeners to that socket, which is what is done below.
//                            v The socket object is passed in automatically by io when a connection is made.
io.on('connection', function (socket) {
    console.log("* * * A new connection has been made.");
    // Each socket object (one for each connected client) has an 'id' property,
    // which can be used to uniquely identify each socket connection.
    // Check the command line that was used to start the server to see
    // the id of each socket that connects being printed.
    console.log("* ID of new socket object: " + socket.id);

    // Using the socket object that was passed in, events can be sent to the
    // client that socket belongs to using .emit(...)
    // The socket object on the client (see Boot.js in /client/js) should have event
    // listeners of the event name that you are sending to it, or it won't pick them up.

    // So if the server emits 'super_event', then the client must also be listening
    // for 'super_event', and vice versa for when the client sends events to the server.

    // In this case, an event called 'hello_client' is sent, and the (optional) second
    // parameter is any data you might want to send along with the event.
    socket.emit('hello_client', {crazyString: 'abc123', coolArray: [40, 'beep', true]});
    // Or with no data, just an event.
    socket.emit('how_are_you');
    // An event that the client isn't listening for, so will be ignored when the client receives it.
    socket.emit('anyone_there');

    // Initialize player properties for the lobby system
    socket.playerName = '';
    socket.isReady = false;
    socket.isInLobby = false;
    socket.isInGame = false;
    socket.isInFakinIt = false;
    socket.isInFictionary = false;

    // Event listeners can be added to this socket. Every time the client sends
    // an event to this server, the server will look to see if the name of that event
    // matches any events that this socket is listening for.

    // In this case, an event listener is being added that will listen for an event
    // called 'change_username', and giving it a callback function to run whenever the
    // event is received. When the client sends this event, they can also pass along data.
    // The data that is sent is automatically passed in to the callback as the first argument.
    // Handle player setting their name (max 12 characters)
    socket.on('set_player_name', function(data) {
        if(data.name && data.name.length <= 12) {
            socket.playerName = data.name.trim();
            console.log("* Player name set to: " + socket.playerName);
            
            // Update lobby if player is already in it
            if(socket.isInLobby) {
                updateLobbyPlayer(socket);
                broadcastLobbyUpdate();
            }
        }
    });

    // Handle player joining the lobby
    socket.on('join_lobby', function() {
        if(!socket.isInLobby && socket.playerName) {
            socket.isInLobby = true;
            socket.join('lobby-room');
            
            // Add player to lobby
            lobbyPlayers[socket.id] = {
                name: socket.playerName,
                isReady: socket.isReady,
                selectedGame: null
            };
            
            console.log("* " + socket.playerName + " joined the lobby.");
            
            // Send current lobby state to the new player
            socket.emit('lobby_joined', prepareLobbyData());
            
            // Broadcast updated lobby to all players
            broadcastLobbyUpdate();
        }
    });

    // Handle player ready status change
    socket.on('toggle_ready', function() {
        if(socket.isInLobby) {
            socket.isReady = !socket.isReady;
            updateLobbyPlayer(socket);
            broadcastLobbyUpdate();
            console.log("* " + socket.playerName + " is now " + (socket.isReady ? "ready" : "not ready"));
        }
    });

    // Handle game selection
    socket.on('select_game', function(data) {
        if(socket.isInLobby && data.game) {
            socket.selectedGame = data.game;
            updateLobbyPlayer(socket);
            broadcastLobbyUpdate();
            console.log("* " + socket.playerName + " selected game: " + data.game);
        }
    });

    // Handle start game request
    socket.on('start_game', function() {
        if(socket.isInLobby) {
            // Check if all players are ready
            var allReady = checkAllPlayersReady();
            if(allReady && Object.keys(lobbyPlayers).length > 0) {
                console.log("* Starting game requested by " + socket.playerName);
                
                // Check what game the majority selected
                var gameSelection = getMajorityGameSelection();
                console.log("* Game selection result: " + gameSelection);
                if(gameSelection === 'Pac-Man') {
                    console.log("* Majority selected Pac-Man - starting Pac-Man game");
                    startPacManGame();
                } else if(gameSelection === "Fakin' it") {
                    console.log("* Majority selected Fakin' it - starting Fakin' it game");
                    startFakinItGame();
                } else if(gameSelection === "Fictionary") {
                    console.log("* Majority selected Fictionary - starting Fictionary game");
                    startFictionaryGame();
                } else {
                    console.log("* No majority for specific game, showing generic message. Game: " + gameSelection);
                    // For other games, just show the generic starting message
                    io.in('lobby-room').emit('game_starting');
                }
            }
        }
    });

    // Handle joining the sprite game (for players coming from lobby or reconnecting)
    socket.on('join_game', function () {
        // Check if this player already exists in the sprite game
        if(players[socket.id]) {
            console.log("* " + socket.playerName + " rejoined sprite game");
            socket.join('game-room');
            socket.isInGame = true;
            socket.isInLobby = false;
            socket.emit('join_game_success');
        } else {
            // Player not found with current socket ID, create new player entry
            console.log("* " + socket.playerName + " joining sprite game as new player");
            players[socket.id] = {
                x: 200 + Math.random() * 200,
                y: 150 + Math.random() * 100,
                name: socket.playerName || 'Player'
            };
            socket.join('game-room');
            socket.isInGame = true;
            socket.isInLobby = false;
            socket.emit('join_game_success');
        }
    });

    // Handle player movement in sprite game
    socket.on('move_player', function (data) {
        if(socket.isInGame && players[socket.id]) {
            // Access the object in the list of players that has the key of this socket ID.
            // 'data.axis' is the axis to move in, x or y.
            // 'data.force' is which direction on the given axis to move, 1 or -1.
            // So if the axis is 'y', and the force is -1, then the player would move up.
            // Change the * 2 multiplier to change the movement speed.
            players[socket.id][data.axis] += data.force * 2;
        }
    });

    // Handle joining Fakin' It game from fakinit.html
    socket.on('join_fakinit_game', function() {
        console.log("* Player attempting to join Fakin' It game: " + socket.id);
        
        // Check if there's an active Fakin' It game
        if (fakinItGame.gameActive && fakinItGame.playerNames && fakinItGame.playerNames.length > 0) {
            // Check if we have room for this player
            var currentPlayerCount = Object.keys(fakinItGame.players).length;
            var expectedPlayerCount = fakinItGame.playerNames.length;
            
            if (currentPlayerCount < expectedPlayerCount) {
                // Assign this socket to the next available player slot
                var playerName = fakinItGame.playerNames[currentPlayerCount];
                
                fakinItGame.players[socket.id] = {
                    name: playerName,
                    score: 0,
                    isFaker: false,
                    answer: null
                };
                
                socket.join('fakinit-room');
                socket.isInFakinIt = true;
                socket.isInLobby = false;
                socket.isInGame = false;
                socket.playerName = playerName;
                
                console.log("* " + playerName + " joined Fakin' It game (" + (currentPlayerCount + 1) + "/" + expectedPlayerCount + ")");
                
                // Check if all players have joined
                if (Object.keys(fakinItGame.players).length === expectedPlayerCount) {
                    console.log("* All players joined, selecting faker and starting game");
                    
                    // Select faker randomly
                    var playerKeys = Object.keys(fakinItGame.players);
                    var randomIndex = Math.floor(Math.random() * playerKeys.length);
                    fakinItGame.faker = playerKeys[randomIndex];
                    fakinItGame.players[fakinItGame.faker].isFaker = true;
                    fakinItGame.waitingForPlayers = false;
                    
                    console.log("* Selected faker: " + fakinItGame.players[fakinItGame.faker].name);
                    
                    // Start first round after a short delay
                    setTimeout(function() {
                        startFakinItRound();
                    }, 2000);
                }
            } else {
                console.log("* Fakin' It game is full");
            }
        } else {
            console.log("* No active Fakin' It game found");
        }
    });

    // Handle Fakin' It game events
    socket.on('fakinit_submit_answer', function(data) {
        if(socket.isInFakinIt && fakinItGame.gameActive && data.answer) {
            console.log("* " + socket.playerName + " submitted answer: " + data.answer);
            fakinItGame.players[socket.id].answer = data.answer;
            
            // Check if all players have submitted answers
            checkAllAnswersSubmitted();
        }
    });

    socket.on('fakinit_vote', function(data) {
        if(socket.isInFakinIt && fakinItGame.gameActive && data.suspectedFaker) {
            console.log("* " + socket.playerName + " voted for: " + data.suspectedFaker);
            fakinItGame.votes[socket.id] = data.suspectedFaker;
            
            // Check if all players have voted
            checkAllVotesSubmitted();
        }
    });

    // Handle Fictionary game events
    socket.on('fictionary_submit_definition', function(data) {
        if(socket.isInFictionary && fictionaryGame.gameActive && data.definition) {
            console.log("* " + socket.playerName + " submitted definition: " + data.definition);
            fictionaryGame.players[socket.id].definition = data.definition;
            fictionaryGame.definitions[socket.id] = {
                playerId: socket.id,
                playerName: socket.playerName,
                definition: data.definition,
                isReal: false
            };
            
            // Check if all players have submitted definitions
            checkAllDefinitionsSubmitted();
        }
    });

    socket.on('fictionary_vote', function(data) {
        if(socket.isInFictionary && fictionaryGame.gameActive && data.definitionId) {
            // Debug: Log vote details
            var votedPlayerName = 'Unknown';
            if (data.definitionId === 'real') {
                votedPlayerName = 'Dictionary';
            } else if (fictionaryGame.players[data.definitionId]) {
                votedPlayerName = fictionaryGame.players[data.definitionId].name;
            }
            
            console.log("* " + socket.playerName + " voted for definition by: " + votedPlayerName + " (ID: " + data.definitionId + ")");
            console.log("* Vote data received - definitionId: '" + data.definitionId + "' (type: " + typeof data.definitionId + ")");
            fictionaryGame.votes[socket.id] = data.definitionId;
            
            // Check if all players have voted
            checkAllFictionaryVotesSubmitted();
        }
    });

    // Handle Fictionary game join
    socket.on('join_fictionary_game', function(data) {
        console.log("* Player attempting to join Fictionary game");
        
        if (fictionaryGame.gameActive && fictionaryGame.waitingForPlayers) {
            var requestedName = data && data.playerName ? data.playerName : null;
            var playerName = null;
            
            if (requestedName) {
                // Check if the requested name is in our expected players list
                if (fictionaryGame.playerNames.includes(requestedName)) {
                    // Check if this name is already connected
                    var alreadyConnected = false;
                    Object.keys(fictionaryGame.players).forEach(function(existingSocketId) {
                        if (fictionaryGame.players[existingSocketId].name === requestedName) {
                            alreadyConnected = true;
                        }
                    });
                    
                    if (!alreadyConnected) {
                        playerName = requestedName;
                        console.log("* Using requested player name: " + playerName);
                    }
                }
            }
            
            // Fallback to original logic if no valid requested name
            if (!playerName) {
                for (var i = 0; i < fictionaryGame.playerNames.length; i++) {
                    var name = fictionaryGame.playerNames[i];
                    var alreadyConnected = false;
                    
                    // Check if this name is already connected
                    Object.keys(fictionaryGame.players).forEach(function(existingSocketId) {
                        if (fictionaryGame.players[existingSocketId].name === name) {
                            alreadyConnected = true;
                        }
                    });
                    
                    if (!alreadyConnected) {
                        playerName = name;
                        break;
                    }
                }
            }
            
            if (playerName) {
                socket.playerName = playerName;
                socket.isInFictionary = true;
                socket.join('fictionary-room');
                
                fictionaryGame.players[socket.id] = {
                    name: playerName,
                    score: 0,
                    definition: null
                };
                
                console.log("* " + playerName + " joined Fictionary game with new socket ID: " + socket.id);
                
                // Check if all players have reconnected
                if (Object.keys(fictionaryGame.players).length === fictionaryGame.playerNames.length) {
                    console.log("* All players reconnected to Fictionary, starting first round");
                    fictionaryGame.waitingForPlayers = false;
                    setTimeout(function() {
                        startFictionaryRound();
                    }, 2000);
                }
            } else {
                console.log("* No available player slot for Fictionary reconnection");
            }
        } else {
            console.log("* Fictionary game not available for joining");
        }
    });

    // Handle Pac-Man game join
    socket.on('join_pacman_game', function(data) {
        console.log("* Player attempting to join Pac-Man game");
        
        if (pacManGame.gameActive && pacManGame.waitingForPlayers) {
            var requestedName = data && data.playerName ? data.playerName : null;
            var playerName = null;
            
            if (requestedName) {
                // Check if the requested name is in our expected players list
                if (pacManGame.playerNames.includes(requestedName)) {
                    // Check if this name is already connected
                    var alreadyConnected = false;
                    Object.keys(pacManGame.players).forEach(function(existingSocketId) {
                        if (pacManGame.players[existingSocketId].name === requestedName) {
                            alreadyConnected = true;
                        }
                    });
                    
                    if (!alreadyConnected) {
                        playerName = requestedName;
                        console.log("* Using requested player name: " + playerName);
                    }
                }
            }
            
            // Fallback to original logic if no valid requested name
            if (!playerName) {
                for (var i = 0; i < pacManGame.playerNames.length; i++) {
                    var name = pacManGame.playerNames[i];
                    var alreadyConnected = false;
                    
                    // Check if this name is already connected
                    Object.keys(pacManGame.players).forEach(function(existingSocketId) {
                        if (pacManGame.players[existingSocketId].name === name) {
                            alreadyConnected = true;
                        }
                    });
                    
                    if (!alreadyConnected) {
                        playerName = name;
                        break;
                    }
                }
            }
            
            if (playerName) {
                socket.playerName = playerName;
                socket.isInPacMan = true;
                socket.join('pacman-room');
                
                // Assign starting positions in different corners
                var cornerPositions = [
                    {x: 2, y: 2},      // Top-left corner
                    {x: 27, y: 2},     // Top-right corner
                    {x: 2, y: 27},     // Bottom-left corner
                    {x: 27, y: 27}     // Bottom-right corner
                ];
                
                var playerIndex = Object.keys(pacManGame.players).length;
                var startPos = cornerPositions[playerIndex % cornerPositions.length];
                var startX = startPos.x;
                var startY = startPos.y;
                
                // If position is occupied by a wall, find nearby empty space
                var attempts = 0;
                while (attempts < 10) {
                    var isWall = pacManGame.maze.some(function(wall) {
                        return wall.x === startX && wall.y === startY;
                    });
                    
                    if (!isWall) break;
                    
                    // Try adjacent positions
                    if (attempts < 4) {
                        startX += (attempts % 2 === 0) ? 1 : -1;
                        startY += (attempts < 2) ? 0 : 1;
                    } else {
                        // Fallback to original corner position + offset
                        startX = startPos.x + (attempts - 4);
                        startY = startPos.y + (attempts - 4);
                    }
                    attempts++;
                }
                
                pacManGame.players[socket.id] = {
                    name: playerName,
                    x: startX,
                    y: startY,
                    direction: 'right',
                    score: 0
                };
                
                console.log("* " + playerName + " joined Pac-Man game at position (" + startX + ", " + startY + ")");
                
                // Send player joined confirmation
                socket.emit('pacman_player_joined', { playerId: socket.id });
                
                // Check if all players have reconnected
                if (Object.keys(pacManGame.players).length === pacManGame.playerNames.length) {
                    console.log("* All players reconnected to Pac-Man, starting game");
                    pacManGame.waitingForPlayers = false;
                    
                    // Send initial game state to all players
                    var gameState = {
                        players: pacManGame.players,
                        pellets: pacManGame.pellets,
                        ghosts: pacManGame.ghosts,
                        maze: pacManGame.maze
                    };
                    
                    io.in('pacman-room').emit('pacman_game_state', gameState);
                    
                    // Start ghost movement
                    startPacManGhostMovement();
                }
            } else {
                console.log("* No available player slot for Pac-Man reconnection");
            }
        } else {
            console.log("* Pac-Man game not available for joining");
        }
    });

    // Handle Pac-Man player movement
    socket.on('pacman_move', function(data) {
        if (socket.isInPacMan && pacManGame.gameActive && data.direction) {
            var player = pacManGame.players[socket.id];
            if (!player) return;
            
            var newX = player.x;
            var newY = player.y;
            
            switch(data.direction) {
                case 'up': newY--; break;
                case 'down': newY++; break;
                case 'left': newX--; break;
                case 'right': newX++; break;
            }
            
            // Handle horizontal wraparound for specific corridors
            var mazeWidth = 30;
            var wraparoundRows = [8, 14, 20]; // Rows that allow horizontal wraparound
            
            if (wraparoundRows.includes(newY)) {
                if (newX < 0) {
                    // Wrap from left edge to right edge
                    newX = mazeWidth - 1;
                } else if (newX >= mazeWidth) {
                    // Wrap from right edge to left edge
                    newX = 0;
                }
            }
            
            // Check for wall collision
            var isWall = pacManGame.maze.some(function(wall) {
                return wall.x === newX && wall.y === newY;
            });
            
            if (!isWall) {
                player.x = newX;
                player.y = newY;
                player.direction = data.direction;
                
                // Check for ghost collision
                var ghostCollision = pacManGame.ghosts.some(function(ghost) {
                    return ghost.x === newX && ghost.y === newY;
                });
                
                if (ghostCollision) {
                    // Player dies - respawn at corner
                    var cornerPositions = [
                        {x: 2, y: 2}, {x: 27, y: 2}, {x: 2, y: 27}, {x: 27, y: 27}
                    ];
                    var playerIndex = Object.keys(pacManGame.players).indexOf(socket.id);
                    var respawnPos = cornerPositions[playerIndex % cornerPositions.length];
                    
                    player.x = respawnPos.x;
                    player.y = respawnPos.y;
                    player.score = Math.max(0, player.score - 50); // Lose 50 points
                    
                    io.in('pacman-room').emit('pacman_player_died', {
                        playerId: socket.id,
                        x: player.x,
                        y: player.y,
                        score: player.score
                    });
                }
                
                // Check for pellet collection
                var pelletIndex = pacManGame.pellets.findIndex(function(pellet) {
                    return pellet.x === newX && pellet.y === newY;
                });
                
                if (pelletIndex !== -1) {
                    // Remove pellet and award points
                    pacManGame.pellets.splice(pelletIndex, 1);
                    player.score += 10;
                    
                    io.in('pacman-room').emit('pacman_pellet_collected', {
                        x: newX,
                        y: newY,
                        playerId: socket.id,
                        score: player.score
                    });
                    
                    // Check if all pellets collected
                    if (pacManGame.pellets.length === 0) {
                        endPacManGame();
                    }
                }
                
                // Broadcast player movement
                io.in('pacman-room').emit('pacman_player_update', {
                    playerId: socket.id,
                    x: player.x,
                    y: player.y,
                    direction: player.direction
                });
            }
        }
    });

    // When a client socket disconnects (closes the page, refreshes, timeout etc.),
    // then this event will automatically be triggered.
    socket.on('disconnecting', function () {
        // Check if this player was in the lobby before they disconnected.
        if(socket.isInLobby === true){
            // Remove this player from the lobby list.
            delete lobbyPlayers[socket.id];
            console.log("* " + socket.playerName + " left the lobby.");
            // Broadcast updated lobby to remaining players
            broadcastLobbyUpdate();
        }
        // Check if this player was in the sprite game before they disconnected.
        if(socket.isInGame === true){
            // Remove this player from the player list.
            delete players[socket.id];
            // Tell other players to remove this player's sprite
            io.in('game-room').emit('remove_player', socket.id);
            console.log("* " + socket.playerName + " left the sprite game.");
        }
        // Check if this player was in Fakin' It game before they disconnected.
        if(socket.isInFakinIt === true){
            // Remove this player from the Fakin' It game
            delete fakinItGame.players[socket.id];
            console.log("* " + socket.playerName + " left the Fakin' It game.");
        }
        // Check if this player was in Fictionary game before they disconnected.
        if(socket.isInFictionary === true){
            // Remove this player from the Fictionary game
            delete fictionaryGame.players[socket.id];
            console.log("* " + socket.playerName + " left the Fictionary game.");
        }
        // Check if this player was in Pac-Man game before they disconnected.
        if(socket.isInPacMan === true){
            // Remove this player from the Pac-Man game
            delete pacManGame.players[socket.id];
            console.log("* " + socket.playerName + " left the Pac-Man game.");
        }
    });

});

// Helper functions for lobby management

function updateLobbyPlayer(socket) {
    if(lobbyPlayers[socket.id]) {
        lobbyPlayers[socket.id].name = socket.playerName;
        lobbyPlayers[socket.id].isReady = socket.isReady;
        lobbyPlayers[socket.id].selectedGame = socket.selectedGame;
    }
}

function broadcastLobbyUpdate() {
    var lobbyData = prepareLobbyData();
    io.in('lobby-room').emit('lobby_update', lobbyData);
    
    // Don't automatically start game - wait for Start Game button
}

function prepareLobbyData() {
    var lobbyData = [];
    var keys = Object.keys(lobbyPlayers);
    keys.forEach(function (key) {
        lobbyData.push({
            id: key,
            name: lobbyPlayers[key].name,
            isReady: lobbyPlayers[key].isReady,
            selectedGame: lobbyPlayers[key].selectedGame
        });
    });
    return lobbyData;
}

function checkAllPlayersReady() {
    var keys = Object.keys(lobbyPlayers);
    if (keys.length === 0) return false;
    
    for (var i = 0; i < keys.length; i++) {
        if (!lobbyPlayers[keys[i]].isReady) {
            return false;
        }
    }
    return true;
}

function checkSpritesGameMajority() {
    var keys = Object.keys(lobbyPlayers);
    if (keys.length === 0) return;
    
    var spritesCount = 0;
    keys.forEach(function(key) {
        if (lobbyPlayers[key].selectedGame === 'Sprites') {
            spritesCount++;
        }
    });
    
    var majority = Math.ceil(keys.length / 2);
    if (spritesCount >= majority) {
        console.log("* Majority selected Sprites game. Starting sprite game...");
        startSpritesGame();
    }
}

function getMajorityGameSelection() {
    var gameCounts = {};
    
    Object.keys(lobbyPlayers).forEach(function(socketId) {
        var selectedGame = lobbyPlayers[socketId].selectedGame;
        if (selectedGame) {
            gameCounts[selectedGame] = (gameCounts[selectedGame] || 0) + 1;
        }
    });
    
    var maxCount = 0;
    var majorityGame = null;
    
    Object.keys(gameCounts).forEach(function(game) {
        if (gameCounts[game] > maxCount) {
            maxCount = gameCounts[game];
            majorityGame = game;
        }
    });
    
    // Return the game with the most votes, even if not majority
    // If no one selected a game, default to Fictionary
    return majorityGame || 'Fictionary';
}

function startSpritesGame() {
    console.log("* startSpritesGame() called");
    
    // Move all lobby players to the sprites game
    var keys = Object.keys(lobbyPlayers);
    console.log("* Converting " + keys.length + " lobby players to game players");
    
    keys.forEach(function(key) {
        // Convert lobby player to game player
        players[key] = {
            x: 200 + Math.random() * 200,
            y: 150 + Math.random() * 100,
            name: lobbyPlayers[key].name
        };
    });
    
    // Clear lobby and move everyone to game room
    console.log("* Sending transition_to_sprites event to lobby-room");
    io.in('lobby-room').emit('transition_to_sprites');
    
    // Move all sockets from lobby-room to game-room
    var lobbyRoom = io.sockets.adapter.rooms['lobby-room'];
    if (lobbyRoom) {
        console.log("* Moving " + Object.keys(lobbyRoom.sockets).length + " sockets from lobby-room to game-room");
        for (var socketId in lobbyRoom.sockets) {
            var socket = io.sockets.sockets[socketId];
            if (socket) {
                socket.leave('lobby-room');
                socket.join('game-room');
                socket.isInLobby = false;
                socket.isInGame = true;
            }
        }
    } else {
        console.log("* No lobby room found!");
    }
    
    // Clear lobby
    lobbyPlayers = {};
    
    console.log("* All players moved to sprites game");
}

function startFakinItGame() {
    console.log("* startFakinItGame() called");
    
    // Move all lobby players to the Fakin' It game
    var keys = Object.keys(lobbyPlayers);
    console.log("* Converting " + keys.length + " lobby players to Fakin' It players");
    
    // Reset game state and store player names separately for reconnection
    fakinItGame.players = {};
    fakinItGame.playerNames = []; // Store names for reconnection
    fakinItGame.votes = {};
    fakinItGame.round = 1;
    fakinItGame.gameActive = true;
    fakinItGame.waitingForPlayers = true;
    
    // Store player names for reconnection
    keys.forEach(function(key) {
        fakinItGame.playerNames.push(lobbyPlayers[key].name);
    });
    
    console.log("* Stored player names: " + fakinItGame.playerNames.join(", "));
    
    // Send transition event to all players
    console.log("* Sending transition_to_fakinit event to lobby-room");
    io.in('lobby-room').emit('transition_to_fakinit');
    
    // Clear lobby
    lobbyPlayers = {};
    
    console.log("* Fakin' It game initialized, waiting for players to reconnect");
}

function startFictionaryGame() {
    console.log("* startFictionaryGame() called");
    
    // Move all lobby players to the Fictionary game
    var keys = Object.keys(lobbyPlayers);
    console.log("* Converting " + keys.length + " lobby players to Fictionary players");
    
    // Reset game state and store player names separately for reconnection
    fictionaryGame.players = {};
    fictionaryGame.playerNames = []; // Store names for reconnection
    fictionaryGame.votes = {};
    fictionaryGame.definitions = {};
    fictionaryGame.round = 1;
    fictionaryGame.gameActive = true;
    fictionaryGame.waitingForPlayers = true;
    
    // Store player names for reconnection
    keys.forEach(function(key) {
        fictionaryGame.playerNames.push(lobbyPlayers[key].name);
    });
    
    console.log("* Stored player names: " + fictionaryGame.playerNames.join(", "));
    
    // Send transition event to all players
    console.log("* Sending transition_to_fictionary event to lobby-room");
    io.in('lobby-room').emit('transition_to_fictionary');
    
    // Clear lobby
    lobbyPlayers = {};
    
    console.log("* Fictionary game initialized, waiting for players to reconnect");
}

// Pac-Man game state
var pacManGame = {
    players: {},
    playerNames: [],
    pellets: [],
    ghosts: [],
    maze: [],
    gameActive: false,
    waitingForPlayers: false
};

function startPacManGame() {
    console.log("* startPacManGame() called");
    
    // Move all lobby players to the Pac-Man game
    var keys = Object.keys(lobbyPlayers);
    console.log("* Converting " + keys.length + " lobby players to Pac-Man players");
    
    // Reset game state and store player names separately for reconnection
    pacManGame.players = {};
    pacManGame.playerNames = [];
    pacManGame.pellets = [];
    pacManGame.ghosts = [];
    pacManGame.maze = [];
    pacManGame.gameActive = true;
    pacManGame.waitingForPlayers = true;
    
    // Store player names for reconnection
    keys.forEach(function(key) {
        pacManGame.playerNames.push(lobbyPlayers[key].name);
    });
    
    console.log("* Stored player names: " + pacManGame.playerNames.join(", "));
    
    // Generate maze and pellets
    generatePacManMaze();
    
    // Send transition event to all players
    console.log("* Sending transition_to_pacman event to lobby-room");
    io.in('lobby-room').emit('transition_to_pacman');
    
    // Clear lobby
    lobbyPlayers = {};
    
    console.log("* Pac-Man game initialized, waiting for players to reconnect");
}

function generatePacManMaze() {
    // Classic Pac-Man maze layout
    pacManGame.maze = [];
    pacManGame.pellets = [];
    
    var width = 30;
    var height = 30;
    
    // Define maze pattern (1 = wall, 0 = empty space)
    var mazePattern = [
        "111111111111111111111111111111",
        "100000000000001100000000000001",
        "101110111110001100111110111101",
        "101110111110001100111110111101",
        "100000000000000000000000000001",
        "101110110111111111110110111101",
        "100000110000001100000110000001",
        "111110111110001100111110111111",
        "000010000010001100100000100000",
        "111110111110111111110111110111",
        "100000100000000000000100000001",
        "101110101111101011111010111101",
        "100010000000101010000000100001",
        "111010111100101010011110101111",
        "000000100000000000000010000000",
        "111010111100101010011110101111",
        "100010000000101010000000100001",
        "101110101111101011111010111101",
        "100000100000000000000100000001",
        "111110111110111111110111110111",
        "000010000010001100100000100000",
        "111110111110001100111110111111",
        "100000110000001100000110000001",
        "101110110111111111110110111101",
        "100000000000000000000000000001",
        "101110111110001100111110111101",
        "101110111110001100111110111101",
        "100000000000001100000000000001",
        "111111111111111111111111111111"
    ];
    
    // Convert pattern to walls
    for (var y = 0; y < height - 1; y++) {
        for (var x = 0; x < width; x++) {
            if (y < mazePattern.length && x < mazePattern[y].length) {
                if (mazePattern[y][x] === '1') {
                    pacManGame.maze.push({x: x, y: y});
                }
            }
        }
    }
    
    // Generate pellets in open spaces (avoid corners where players spawn)
    var cornerPositions = [{x: 2, y: 2}, {x: 27, y: 2}, {x: 2, y: 27}, {x: 27, y: 27}];
    
    for (var x = 1; x < width - 1; x++) {
        for (var y = 1; y < height - 2; y++) {
            var isWall = pacManGame.maze.some(function(wall) {
                return wall.x === x && wall.y === y;
            });
            
            var isCorner = cornerPositions.some(function(corner) {
                return Math.abs(corner.x - x) <= 1 && Math.abs(corner.y - y) <= 1;
            });
            
            if (!isWall && !isCorner) {
                pacManGame.pellets.push({x: x, y: y});
            }
        }
    }
    
    // Position ghosts in center area
    pacManGame.ghosts = [
        {x: 14, y: 14, direction: 'up'},
        {x: 15, y: 14, direction: 'right'},
        {x: 14, y: 15, direction: 'left'},
        {x: 15, y: 15, direction: 'down'}
    ];
}

// Fictionary words database (obscure words with real definitions)
var fictionaryWords = [
    { word: "Petrichor", definition: "The pleasant smell of earth after rain" },
    { word: "Sonder", definition: "The realization that each passerby has a life as vivid as your own" },
    { word: "Apricity", definition: "The warmth of the sun in winter" },
    { word: "Hiraeth", definition: "A homesickness for a home you can't return to" },
    { word: "Vellichor", definition: "The strange wistfulness of used bookstores" },
    { word: "Defenestration", definition: "The act of throwing someone out of a window" },
    { word: "Callipygian", definition: "Having well-shaped buttocks" },
    { word: "Borborygmus", definition: "The rumbling sound of gas moving through the intestines" },
    { word: "Tmesis", definition: "The insertion of a word between parts of a compound word" },
    { word: "Ultracrepidarian", definition: "Someone who gives opinions on matters beyond their knowledge" },
    { word: "Kakorrhaphiophobia", definition: "The fear of failure or defeat" },
    { word: "Pneumonoultramicroscopicsilicovolcanoconosis", definition: "A lung disease caused by inhaling very fine silicate dust" }
];

// Fakin' It prompts database
var fakinItPrompts = [
    "Name something you'd find in a kitchen",
    "Name a type of weather",
    "Name something you wear",
    "Name an animal",
    "Name a color",
    "Name something you do in the morning",
    "Name a school subject",
    "Name something round",
    "Name a movie genre",
    "Name something cold"
];

function startFakinItRound() {
    if (!fakinItGame.gameActive) return;
    
    console.log("* Starting Fakin' It round " + fakinItGame.round);
    
    // Select random prompt
    var promptIndex = Math.floor(Math.random() * fakinItPrompts.length);
    fakinItGame.currentPrompt = fakinItPrompts[promptIndex];
    
    console.log("* Round prompt: " + fakinItGame.currentPrompt);
    
    // Send prompt to all players except faker
    var playerKeys = Object.keys(fakinItGame.players);
    playerKeys.forEach(function(socketId) {
        var socket = io.sockets.sockets[socketId];
        if (socket) {
            if (socketId === fakinItGame.faker) {
                // Send faker message
                socket.emit('fakinit_round_start', {
                    round: fakinItGame.round,
                    isFaker: true,
                    prompt: "You are the FAKER! Try to blend in with the others."
                });
            } else {
                // Send real prompt
                socket.emit('fakinit_round_start', {
                    round: fakinItGame.round,
                    isFaker: false,
                    prompt: fakinItGame.currentPrompt
                });
            }
        }
    });
}

function checkAllAnswersSubmitted() {
    var playerKeys = Object.keys(fakinItGame.players);
    var allSubmitted = playerKeys.every(function(socketId) {
        return fakinItGame.players[socketId].answer;
    });
    
    if (allSubmitted) {
        console.log("* All answers submitted, showing voting phase");
        
        // Prepare answers for voting (shuffle to hide faker position)
        var answers = playerKeys.map(function(socketId) {
            return {
                playerId: socketId,
                playerName: fakinItGame.players[socketId].name,
                answer: fakinItGame.players[socketId].answer
            };
        });
        
        // Shuffle answers
        for (var i = answers.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = answers[i];
            answers[i] = answers[j];
            answers[j] = temp;
        }
        
        // Send answers to all players for voting
        io.in('fakinit-room').emit('fakinit_show_answers', { answers: answers });
    }
}

function checkAllVotesSubmitted() {
    var playerKeys = Object.keys(fakinItGame.players);
    var allVoted = playerKeys.every(function(socketId) {
        return fakinItGame.votes[socketId];
    });
    
    if (allVoted) {
        console.log("* All votes submitted, calculating results");
        
        // Count votes
        var voteCounts = {};
        Object.keys(fakinItGame.votes).forEach(function(voterSocketId) {
            var suspectedFaker = fakinItGame.votes[voterSocketId];
            voteCounts[suspectedFaker] = (voteCounts[suspectedFaker] || 0) + 1;
        });
        
        // Find player with most votes
        var mostVotedPlayer = null;
        var maxVotes = 0;
        Object.keys(voteCounts).forEach(function(socketId) {
            if (voteCounts[socketId] > maxVotes) {
                maxVotes = voteCounts[socketId];
                mostVotedPlayer = socketId;
            }
        });
        
        var fakerCaught = (mostVotedPlayer === fakinItGame.faker);
        var fakerName = fakinItGame.players[fakinItGame.faker].name;
        
        // Update scores
        if (fakerCaught) {
            // Give points to all non-faker players
            Object.keys(fakinItGame.players).forEach(function(socketId) {
                if (socketId !== fakinItGame.faker) {
                    fakinItGame.players[socketId].score += 1;
                }
            });
        } else {
            // Give points to the faker
            fakinItGame.players[fakinItGame.faker].score += 2;
        }
        
        // Send results
        io.in('fakinit-room').emit('fakinit_round_results', {
            fakerCaught: fakerCaught,
            fakerName: fakerName,
            mostVotedPlayer: mostVotedPlayer ? fakinItGame.players[mostVotedPlayer].name : 'Nobody'
        });
        
        // Reset for next round
        Object.keys(fakinItGame.players).forEach(function(socketId) {
            fakinItGame.players[socketId].answer = null;
        });
        fakinItGame.votes = {};
        fakinItGame.round++;
        
        // Start next round after delay
        setTimeout(function() {
            if (fakinItGame.round <= 3) { // Play 3 rounds
                // Select new faker
                var playerKeys = Object.keys(fakinItGame.players);
                var randomIndex = Math.floor(Math.random() * playerKeys.length);
                
                // Reset faker status
                Object.keys(fakinItGame.players).forEach(function(socketId) {
                    fakinItGame.players[socketId].isFaker = false;
                });
                
                fakinItGame.faker = playerKeys[randomIndex];
                fakinItGame.players[fakinItGame.faker].isFaker = true;
                
                startFakinItRound();
            } else {
                // Game over - show final scores
                endFakinItGame();
            }
        }, 5000);
    }
}

function endFakinItGame() {
    console.log("* Fakin' It game ended");
    fakinItGame.gameActive = false;
    
    // Calculate final scores and send to players
    var finalScores = Object.keys(fakinItGame.players).map(function(socketId) {
        return {
            name: fakinItGame.players[socketId].name,
            score: fakinItGame.players[socketId].score
        };
    });
    
    // Sort by score
    finalScores.sort(function(a, b) { return b.score - a.score; });
    
    io.in('pacman-room').emit('pacman_game_over', { scores: finalScores });
}

function startPacManGhostMovement() {
    setInterval(function() {
        if (!pacManGame.gameActive) return;
        
        pacManGame.ghosts.forEach(function(ghost) {
            var directions = ['up', 'down', 'left', 'right'];
            var validDirections = [];
            
            directions.forEach(function(dir) {
                var newX = ghost.x;
                var newY = ghost.y;
                
                switch(dir) {
                    case 'up': newY--; break;
                    case 'down': newY++; break;
                    case 'left': newX--; break;
                    case 'right': newX++; break;
                }
                
                var isWall = pacManGame.maze.some(function(wall) {
                    return wall.x === newX && wall.y === newY;
                });
                
                if (!isWall) {
                    validDirections.push({dir: dir, x: newX, y: newY});
                }
            });
            
            if (validDirections.length > 0) {
                var randomDir = validDirections[Math.floor(Math.random() * validDirections.length)];
                ghost.x = randomDir.x;
                ghost.y = randomDir.y;
                ghost.direction = randomDir.dir;
            }
        });
        
        io.in('pacman-room').emit('pacman_ghost_update', {
            ghosts: pacManGame.ghosts
        });
    }, 1000);
}

function endPacManGame() {
    console.log("* Pac-Man game ended");
    pacManGame.gameActive = false;
    
    // Calculate final scores and send to players
    var finalScores = Object.keys(pacManGame.players).map(function(socketId) {
        return {
            name: pacManGame.players[socketId].name,
            score: pacManGame.players[socketId].score
        };
    }).sort(function(a, b) {
        return b.score - a.score;
    });
    
    io.in('pacman-room').emit('pacman_game_over', { scores: finalScores });
}

// Fictionary game functions
function startFictionaryRound() {
    if (!fictionaryGame.gameActive) return;
    
    console.log("* Starting Fictionary round " + fictionaryGame.round);
    
    // Select random word
    var wordIndex = Math.floor(Math.random() * fictionaryWords.length);
    var selectedWord = fictionaryWords[wordIndex];
    fictionaryGame.currentWord = selectedWord.word;
    fictionaryGame.currentRealDefinition = selectedWord.definition;
    
    console.log("* Round word: " + fictionaryGame.currentWord);
    console.log("* Real definition: " + fictionaryGame.currentRealDefinition);
    
    // Reset definitions and add the real one
    fictionaryGame.definitions = {};
    fictionaryGame.definitions['real'] = {
        playerId: 'real',
        playerName: 'Dictionary',
        definition: fictionaryGame.currentRealDefinition,
        isReal: true
    };
    
    // Send word to all players
    var playerKeys = Object.keys(fictionaryGame.players);
    playerKeys.forEach(function(socketId) {
        var socket = io.sockets.sockets[socketId];
        if (socket) {
            socket.emit('fictionary_round_start', {
                round: fictionaryGame.round,
                word: fictionaryGame.currentWord
            });
        }
    });
}

function checkAllDefinitionsSubmitted() {
    var playerKeys = Object.keys(fictionaryGame.players);
    var allSubmitted = playerKeys.every(function(socketId) {
        return fictionaryGame.players[socketId].definition;
    });
    
    if (allSubmitted) {
        console.log("* All definitions submitted, showing voting phase");
        
        // Prepare definitions for voting (shuffle to hide order)
        var definitions = Object.keys(fictionaryGame.definitions).map(function(key) {
            return fictionaryGame.definitions[key];
        });
        
        // Debug: Log definitions before shuffling
        console.log("* Definitions before shuffling:");
        definitions.forEach(function(def) {
            console.log("  - " + def.playerName + " (" + def.playerId + "): " + def.definition);
        });
        
        // Shuffle definitions
        for (var i = definitions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = definitions[i];
            definitions[i] = definitions[j];
            definitions[j] = temp;
        }
        
        // Debug: Log definitions after shuffling
        console.log("* Definitions after shuffling:");
        definitions.forEach(function(def, index) {
            console.log("  " + (index + 1) + ". " + def.playerName + " (" + def.playerId + "): " + def.definition);
        });
        
        // Send definitions to all players for voting
        io.in('fictionary-room').emit('fictionary_show_definitions', { 
            word: fictionaryGame.currentWord,
            definitions: definitions 
        });
    }
}

function checkAllFictionaryVotesSubmitted() {
    var playerKeys = Object.keys(fictionaryGame.players);
    var allVoted = playerKeys.every(function(socketId) {
        return fictionaryGame.votes[socketId];
    });
    
    if (allVoted) {
        console.log("* All votes submitted, calculating Fictionary results");
        
        // Debug: Log all votes
        console.log("* Vote breakdown:");
        Object.keys(fictionaryGame.votes).forEach(function(voterSocketId) {
            var voterName = fictionaryGame.players[voterSocketId].name;
            var votedDefinitionId = fictionaryGame.votes[voterSocketId];
            var votedPlayerName = 'Unknown';
            
            if (votedDefinitionId === 'real') {
                votedPlayerName = 'Dictionary';
            } else if (fictionaryGame.players[votedDefinitionId]) {
                votedPlayerName = fictionaryGame.players[votedDefinitionId].name;
            }
            
            console.log("  - " + voterName + " voted for: " + votedPlayerName + " (ID: " + votedDefinitionId + ")");
        });
        
        // Count votes for each definition (excluding self-votes)
        var voteCounts = {};
        Object.keys(fictionaryGame.votes).forEach(function(voterSocketId) {
            var votedDefinitionId = fictionaryGame.votes[voterSocketId];
            
            // Only count vote if player didn't vote for their own definition
            if (votedDefinitionId !== voterSocketId) {
                voteCounts[votedDefinitionId] = (voteCounts[votedDefinitionId] || 0) + 1;
            }
        });
        
        // Debug: Log vote counts
        console.log("* Vote counts by player ID:");
        Object.keys(voteCounts).forEach(function(playerId) {
            var playerName = 'Unknown';
            if (playerId === 'real') {
                playerName = 'Dictionary';
            } else if (fictionaryGame.players[playerId]) {
                playerName = fictionaryGame.players[playerId].name;
            }
            console.log("  - " + playerName + " (" + playerId + "): " + voteCounts[playerId] + " votes");
        });
        
        // Calculate scores
        Object.keys(fictionaryGame.players).forEach(function(socketId) {
            var player = fictionaryGame.players[socketId];
            
            // Points for people voting for your fake definition (1 point per vote)
            var votesForMyDefinition = voteCounts[socketId] || 0;
            player.score += votesForMyDefinition * 1;
            
            console.log("* " + player.name + " received " + votesForMyDefinition + " votes for their definition, gaining " + (votesForMyDefinition * 1) + " points");
            
            // Points for voting for the real definition (2 points)
            var playerVote = fictionaryGame.votes[socketId];
            console.log("* Checking " + player.name + "'s vote: '" + playerVote + "' (type: " + typeof playerVote + ")");
            
            if (playerVote === 'real') {
                player.score += 2;
                console.log("* " + player.name + " voted for the real definition, gaining 2 points");
            } else if (playerVote === socketId) {
                console.log("* " + player.name + " voted for their own definition, no points awarded");
            } else {
                console.log("* " + player.name + " voted for another player's fake definition, no points awarded");
            }
        });
        
        // Create vote counts by player name for client display
        var voteCountsByName = {};
        Object.keys(voteCounts).forEach(function(votedId) {
            if (votedId === 'real') {
                voteCountsByName['Dictionary'] = voteCounts[votedId];
            } else {
                var playerName = fictionaryGame.players[votedId] ? fictionaryGame.players[votedId].name : 'Unknown';
                voteCountsByName[playerName] = voteCounts[votedId];
            }
        });
        
        // Create scoring breakdown for round results
        var scoringBreakdown = [];
        Object.keys(fictionaryGame.players).forEach(function(socketId) {
            var player = fictionaryGame.players[socketId];
            var playerVote = fictionaryGame.votes[socketId];
            var votesForMyDefinition = voteCounts[socketId] || 0;
            
            // Track points awarded this round
            var pointsThisRound = 0;
            var reasons = [];
            
            // Points for votes on fake definition
            if (votesForMyDefinition > 0) {
                pointsThisRound += votesForMyDefinition * 1;
                reasons.push(votesForMyDefinition + " vote" + (votesForMyDefinition > 1 ? "s" : "") + " for fake definition (+1 each)");
            }
            
            // Points for voting for real definition (but not own definition)
            if (playerVote === 'real') {
                pointsThisRound += 2;
                reasons.push("Guessed correct definition (+2)");
            } else if (playerVote === socketId) {
                // No points for voting for own definition - don't add to breakdown
            }
            
            if (pointsThisRound > 0) {
                scoringBreakdown.push({
                    name: player.name,
                    pointsThisRound: pointsThisRound,
                    reasons: reasons
                });
            }
        });
        
        // Prepare results
        var results = {
            word: fictionaryGame.currentWord,
            realDefinition: fictionaryGame.currentRealDefinition,
            voteCounts: voteCountsByName,
            scoringBreakdown: scoringBreakdown,
            playerScores: Object.keys(fictionaryGame.players).map(function(socketId) {
                return {
                    name: fictionaryGame.players[socketId].name,
                    score: fictionaryGame.players[socketId].score,
                    definition: fictionaryGame.players[socketId].definition
                };
            })
        };
        
        // Send results
        io.in('fictionary-room').emit('fictionary_round_results', results);
        
        // Reset for next round
        Object.keys(fictionaryGame.players).forEach(function(socketId) {
            fictionaryGame.players[socketId].definition = null;
        });
        fictionaryGame.votes = {};
        fictionaryGame.definitions = {};
        
        // Check if game is over or continue to next round
        if (fictionaryGame.round >= 3) {
            setTimeout(function() {
                endFictionaryGame();
            }, 10000);
        } else {
            fictionaryGame.round++;
            setTimeout(function() {
                startFictionaryRound();
            }, 6000);
        }
    }
}

function endFictionaryGame() {
    console.log("* Fictionary game ended");
    fictionaryGame.gameActive = false;
    
    // Calculate final scores and send to players
    var finalScores = Object.keys(fictionaryGame.players).map(function(socketId) {
        return {
            name: fictionaryGame.players[socketId].name,
            score: fictionaryGame.players[socketId].score
        };
    });
    
    // Sort by score
    finalScores.sort(function(a, b) { return b.score - a.score; });
    
    io.in('fictionary-room').emit('fictionary_game_over', { scores: finalScores });
}

// Game emitter for sprite game updates
var emitRate = 100;
setInterval(function () {
    // Only send updates if there are players in the game
    if (Object.keys(players).length > 0) {
        // Prepare the positions of the players, ready to send to all players.
        var dataToSend = preparePlayersDataToSend();
        // Send the data to all clients in the room called 'game-room'.
        io.in('game-room').emit('state_update', dataToSend);
    }
}, emitRate);

function preparePlayersDataToSend() {
    // Prepare the positions of the players, ready to send to all players.
    var dataToSend = [];
    // 'players' is an object, so get a list of the keys.
    var keys = Object.keys(players);
    // Loop though the list of players and get the position of each player.
    keys.forEach(function (key) {
        // Add the position (and ID, so the client knows who is where) to the data to send.
        dataToSend.push({id: key, x: players[key].x, y: players[key].y});
    });
    return dataToSend;
}
