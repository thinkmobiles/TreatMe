
var socketEvents = function (app) {

    'use strict';

    var io = app.get('io');
    var db = app.get('db');

    io.on('connection', function( socket ) {

        socket.emit('connectedToServer', {success: true});

        socket.on('authorize', function (userId){
            console.log('>>> User with userId: ' + userId + ' connected to socket ' + socket.id);
            socket.join(userId);
        });


        socket.on('disconnect', function(){
            console.log('>>> socket ' + socket.id + ' disconnected');
        });
    });
};

module.exports = socketEvents;

