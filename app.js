var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , UUID = require('node-uuid');

var express = require('express');
app.use('/public', express.static(__dirname+'/public'));

server.listen(8800);
io.set('log level', 1); // reduce logging

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

var currentPlayers = [];
var availColors = ["blue", "red", "green"];

var connectedUsers = [];

var gameBoard = new Array(800);
for (var i=0; i<gameBoard.length;i++){
    gameBoard[i] = new Array(500);
}

for (var i=0; i<gameBoard.length; i++){
    for (var j=0; j<gameBoard[i]; j++){
        gameBoard[i][j] = false;
    }
}

function Player(x, y, clientID){
    this.color = availColors.pop();
    this.x = x;
    this.y = y;
    this.clientID = clientID;
    this.direction = 'up';
    this.alive = true;
}

setInterval(gameLoop, 25);
function gameLoop(){
            if (currentPlayers.length == 0 && connectedUsers.length >= 2){
                for (var i=0; i < 2; i++){
                    switch (i) {
                        case 0:
                            currentPlayers[0] = new Player(300, 250, connectedUsers[i]);
                            break;
                        case 1:
                            currentPlayers[1] = new Player(500, 250, connectedUsers[i]);
                            break;
                    }
                }
            }

            for (var i = 0; i < currentPlayers.length; i++){
                var p = currentPlayers[i];
                movePlayer(p);
                if(p.x < 0 || p.x > 790 || p.y < 0 || p.y > 490){
                    p.alive = false;
                }
            }
            checkForDeadies(currentPlayers);
            io.sockets.emit('update', { currentPlayers: currentPlayers } );
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
            break;
        case 'left':
            p.x = p.x - speed;
            break;
        case 'right':
            p.x = p.x + speed;
            break;
        case 'down':
            p.y = p.y + speed;
            break;
     }
}

function movePlayer2(p) {
    var w = 800, h = 500;
    var ph = 10;
    var ps = 10;
    var mx = 0, my = 0;
    var died = false;
    switch (p.direction) {
        case 'up':
            my = -1;
            break;
        case 'down':
            my = 1;
            break;
        case 'left':
            mx = -1;
            break;
        case 'right':
            mx = 1;
            break;
    }
    var dy = Math.max(Math.min(w-ph, p.y+my*ps), 0);
    var dx = Math.max(Math.min(h-ph, p.x+mx*ps), 0);
    if (dy !== p.y+my*ps || dx !== p.x+mx*ps) { died = true; }
    for (var i = p.x; i < p.x + dx + ph*Math.abs(my); i++){
        for (var j = p.y; j < p.y + dy + ph*Math.abs(mx); j++){
            if (gameBoard[i][j] !== false){ 
                died = true;
            } else {
                gameBoard[i][j] = true;
            }
        }
    }
    p.y += dy;
    p.x += dx;
    
}


io.sockets.on('connection', function (client) {
        //Generate a new UUID, looks something like 
        //5b2ca132-64bd-4513-99da-90e838ca47d1
        //and store this on their socket/connection
        client.userid = UUID();

        //Useful to know when someoce connects
        console.log('\t socket.io:: player ' + client.userid + ' connected');
        connectedUsers.push(client.userid);

        //When this client changes direction
        client.on('changedirection', function (data) {
            var direction = data.dir;
            for (var i=0; i<currentPlayers.length;i++){
                if (currentPlayers[i].clientID == client.userid){
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
                if (connectedUsers[i] == client.userid){
                    connectedUsers.splice(i, 1);
                }
            }
            io.sockets.emit('disconnected', { connectedUsers:  connectedUsers} );
        });

        io.sockets.emit('connected', { connectedUsers: connectedUsers } );
    });

