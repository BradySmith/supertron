
var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , UUID = require('node-uuid');

server.listen(8800);
io.set('log level', 1); // reduce logging

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

var currentPlayers = [];

function Player(color, x, y, clientID){
    this.color = color;
    this.x = x;
    this.y = y;
    this.clientID = clientID;
    this.direction = 'up';
}

var playercount = 0;

setInterval(gameLoop, 25);
function gameLoop(){
        if (typeof currentPlayers !== 0) {
            for (var i = 0; i < currentPlayers.length; i++){
                var p = currentPlayers[i];
                movePlayer(p);
            }

            io.sockets.emit('update', { currentPlayers: currentPlayers } );
        }
}
function movePlayer(p) {
    var speed = 10;
    switch (p.direction) {
        case 'up':
            p.y = p.y - speed;
            if (p.y < 0){p.y = 0;}
            break;
        case 'left':
            p.x = p.x - speed;
            if (p.x < 0){p.x = 0;}
            break;
        case 'right':
            p.x = p.x + speed;
            if (p.x > 790){p.x = 790;}
            break;
        case 'down':
            p.y = p.y + speed;
            if (p.y > 490){p.y = 490;}
            break;
     }
}

io.sockets.on('connection', function (client) {
        //Generate a new UUID, looks something like 
        //5b2ca132-64bd-4513-99da-90e838ca47d1
        //and store this on their socket/connection
        client.userid = UUID();

        //Useful to know when someoce connects
        console.log('\t socket.io:: player ' + client.userid + ' connected');

        var x;
        switch (playercount) {
            case 0:
                currentPlayers[0] = new Player("blue", 300, 250, client.userid);
                playercount++;
                break;
            case 1:
                currentPlayers[1] = new Player("red", 500, 250, client.userid);
                playercount++;
                break;
            case 2:
                currentPlayers[2] = new Player("green", 400, 250, client.userid);
                playercount++;
                break;
            case 3:
                break;
        }

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
            playercount--;
        }); //client.on disconnect

    }); //sio.sockets.on connection

