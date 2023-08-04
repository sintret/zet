const io = require('socket.io')();

//room = token
let socketArray = [];

io.on('connection', function (socket) {
    socket.emit('sessiondata', socket.handshake.session);
    // Set session data via socket
    socket.on('login', function() {
        //console.log('Received login message');
        socket.handshake.session.user = {
            username: 'OSK'
        };
        //console.log('socket.handshake session data is %j.', socket.handshake.session);

        // socket.handshake.session.save();
        //emit logged_in for debugging purposes of this example
        socket.emit('logged_in', socket.handshake.session);
    });
    // Unset session data via socket
    socket.on('checksession', function() {
       // console.log('Received checksession message');
        // console.log('socket.handshake session data is %j.', socket.handshake.session);
        socket.emit('checksession', socket.handshake.session);
    });
    // Unset session data via socket
    socket.on('logout', function() {
        console.log('Received logout message');
        delete socket.handshake.session.user;
        // socket.handshake.session.save();
        //emit logged_out for debugging purposes of this example
        //console.log('socket.handshake session data is %j.', socket.handshake.session);

        socket.emit('logged_out', socket.handshake.session);
    });

    socket.on('room', function(room) {
        socket.join(room);
    });

});

io.socketArray = socketArray;

module.exports = io;
