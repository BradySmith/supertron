var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , UUID = require('node-uuid')
  , arrayfile = require('./public/arrays');

var express = require('express');
app.use('/public', express.static(__dirname+'/public'));

server.listen(8800);
io.set('log level', 1); // reduce logging

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

var currentPlayers = [];
var availColors = ["blue", "red", "green"];

// random names
var names = arrayfile.names;
var adjectives = arrayfile.adjectives;

var connectedUsers = [];

var gameBoard = new Array(800);
for (var i=0; i<gameBoard.length;i++){
    gameBoard[i] = new Array(500);
}



function User (clientID, nickname){
    this.clientID = clientID;
    this.nickname = nickname;
}

function Player(x, y, clientID, nickname){
    this.color = availColors.pop();
    this.x = x;
    this.y = y;
    this.clientID = clientID;
    this.direction = 'up';
    this.alive = true;
    this.nickname = nickname;
}

function resetGameBoard(){
    for (var i=0; i<gameBoard.length; i++){
        for (var j=0; j<gameBoard[i].length; j++){
            gameBoard[i][j] = false;
        }
    }
}

setInterval(gameLoop, 25);
function gameLoop(){
            if (currentPlayers.length == 0 && connectedUsers.length >= 1){
                io.sockets.emit('newGame', { newGame: 'placeholder' });
                resetGameBoard();
                for (var i=0; i < 3; i++){
                    switch (i) {
                        case 0:
                            currentPlayers[0] = new Player(300, 250, connectedUsers[i].clientID, connectedUsers[i].nickname);
                            break;
                        case 1:
                            if (connectedUsers.length > 1){
                                currentPlayers[1] = new Player(500, 250, connectedUsers[i].clientID, connectedUsers[i].nickname);
                            }
                            break;
                        case 2:
                            if (connectedUsers.length > 2){
                                currentPlayers[2] = new Player(400, 250, connectedUsers[i].clientID, connectedUsers[i].nickname);
                            }
                            break;
                    }
                }
            }

            for (var i = 0; i < currentPlayers.length; i++){
                var p = currentPlayers[i];
                movePlayer(p);
                checkForCollisions(p);
            }
            io.sockets.emit('update', { currentPlayers: currentPlayers } );
            checkForDeadies(currentPlayers);
}

function checkForCollisions(p){
    // Check for out of bounds
    if(p.x < 0 || p.x > 790 || p.y < 0 || p.y > 490){
        p.alive = false;
    }

    // Check 
}

function checkForDeadies(p){
    for (var i = 0; i < p.length; i++){
        if (p[i].alive == false){
                availColors.push(currentPlayers[i].color);
                currentPlayers.splice(i, 1);
        }
    }
}

function movePlayer(p) {
    var speed = 10;
    switch (p.direction) {
        case 'up':
            p.y = p.y - speed;
            markGrid(p, "up");
            break;
        case 'left':
            p.x = p.x - speed;
            markGrid(p, "left");
            break;
        case 'right':
            p.x = p.x + speed;
            markGrid(p, "right");
            break;
        case 'down':
            p.y = p.y + speed;
            markGrid(p, "down");
            break;
     }
}

function markGrid(p, d) {
    var size = 10;
    var x, y;
    if (d == "up"){
        for ( x = p.x; x < (p.x + size); x++){
            for ( y = (p.y+(size - 1)); y >= (p.y); y--){
                if (y >= 0){    // Check for Array Out of Bounds
                    if (gameBoard[x][y] == true) {
                         p.alive = false;
                    }
                        gameBoard[x][y] = true;
                }
            }
        }
    }
    else if (d == "down") {
        for ( x = (p.x); x < (p.x + size); x++){
            for ( y = (p.y); y < (p.y + size); y++){
                if (y <= 500){  // Check for Array Out of Bounds
                    if (gameBoard[x][y] == true) {
                         p.alive = false;
                    }
                    gameBoard[x][y] = true;
                }
            }
        }
    }
    else if (d == "left"){ // still buggy 
        for ( x = (p.x+(size-1)); x >= (p.x); x--){
            for ( y = (p.y); y < (p.y + size); y++){
                if (x >= 0){  // Check for Array Out of Bounds
                    if (gameBoard[x][y] == true) {
                         p.alive = false;
                    }
                    gameBoard[x][y] = true;
                }
            }
        }
    }
    else if (d == "right"){
        for ( x = (p.x); x < (p.x + size); x++){
            for ( y = (p.y); y < (p.y + 10); y++){
                if (x < 800){  // Check for Array Out of Bounds
                    if (gameBoard[x][y] == true) {
                         p.alive = false;
                    }
                    gameBoard[x][y] = true;
                }
            }
        }
    }
}

io.sockets.on('connection', function (client) {
        //Generate a new UUID, looks something like 
        //5b2ca132-64bd-4513-99da-90e838ca47d1
        //and store this on their socket/connection
        client.userid = UUID();

        //Useful to know when someoce connects
        console.log('\t socket.io:: player ' + client.userid + ' connected');
        var nameIndex = Math.floor(Math.random()*names.length);
        var adjIndex = Math.floor(Math.random()*adjectives.length);
        var randName = adjectives[adjIndex] + " " + names[nameIndex];
        randName = randName.charAt(0).toUpperCase() + randName.slice(1);
        var newUser = new User(client.userid, randName);
        connectedUsers.push(newUser);

        //When this client changes direction
        client.on('changedirection', function (data) {
            var direction = data.dir;
            for (var i=0; i<currentPlayers.length;i++){
                if (currentPlayers[i].clientID == client.userid){
                    if (currentPlayers[i].direction == 'up' || currentPlayers[i].direction == 'down'){
                        if (direction == 'up' || direction == 'down'){
                            break;
                        }
                    }
                    if (currentPlayers[i].direction == 'left' || currentPlayers[i].direction == 'right'){
                        if (direction == 'left' || direction == 'right'){
                            break;
                        }
                    }
                    currentPlayers[i].direction = direction;
                }
            }
        });

        //When this client disconnects
        client.on('disconnect', function () {
            //Useful to know when someone disconnects
            console.log('\t socket.io:: client disconnected ' + client.userid );
            for (var i=0; i<currentPlayers.length;i++){
                if (currentPlayers[i].clientID == client.userid){
                    availColors.push(currentPlayers[i].color);
                    currentPlayers.splice(i, 1);
                }
            }

            for (var i=0; i<connectedUsers.length;i++){
                if (connectedUsers[i].clientID == client.userid){
                    connectedUsers.splice(i, 1);
                }
            }
            io.sockets.emit('disconnected', { connectedUsers:  connectedUsers} );
        });

        client.on('nameChange', function(data){
            for (var i=0; i<connectedUsers.length;i++){
                if (connectedUsers[i].clientID == client.userid){
                    connectedUsers[i].nickname = data.name;
                }
            }

            for (var i=0; i<currentPlayers.length;i++){
                if (currentPlayers[i].clientID == client.userid){
                    currentPlayers[i].nickname = data.name;
                }
            }

            io.sockets.emit('connected', { connectedUsers: connectedUsers } );
        });

        io.sockets.emit('connected', { connectedUsers: connectedUsers } );
    });

