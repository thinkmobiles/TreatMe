module.exports = function () {

    'use strict';

    var express = require('express');
    var app = express();
    var path = require('path');
    var logger = require('morgan');
    var mongoose = require('mongoose');
    var http = require('http');
    var bodyParser = require('body-parser');
    var server = http.createServer(app);
    var connectOptions;
    var mainDb;
    var session = require('express-session');
    var MongoStore = require('connect-mongo')(session);

    if (!process.env.NODE_ENV) {
        //TODO change NODE_ENV for production server
        //process.env.NODE_ENV = 'test';
        process.env.NODE_ENV = 'development';
        //process.env.NODE_ENV = 'production';
    }

    if (process.env.NODE_ENV === 'production') {
        console.log('-----Server start success in Production version--------');
        require('./config/production');
    } else if (process.env.NODE_ENV === 'development') {
        console.log('-----Server start success in Development version--------');
        require('./config/development');
    } else {
        console.log('-----Server start success in TEST version--------');
        require('./config/test');
    }

    app.set('port', process.env.PORT || 8871);

    //=====socket.io==========================
    var io = require('socket.io')(server);
    app.set('io', io);
    //=========================================

    app.use(express.static(__dirname + '/public'));
    app.use(logger('dev'));
    app.use(bodyParser.json({strict: false, limit: 1024 * 1024 * 200}));
    app.use(bodyParser.urlencoded({extended: false}));

    connectOptions = {
        db: {native_parser: false},
        server: {poolSize: 5},
        user: process.env.DB_USER,
        pass: process.env.DB_PASS
    };

    mainDb = mongoose.createConnection(process.env.DB_HOST, process.env.DB_NAME, process.env.DB_PORT, connectOptions);

    require('./models/index')(mainDb);
    app.set('db', mainDb);

    require('./helpers/socketEvents')(app);

    mainDb.on('error', console.error.bind(console, 'connection error:'));
    mainDb.once('open', function callback() {
        console.log("Connection to " + process.env.DB_NAME + " is success");

        app.use(session({
            secret: 'ds',
            resave: true,
            saveUninitialized: true,
            maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // ten years
            store: new MongoStore({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                db: process.env.DB_NAME,
                autoReconnect: true,
                ssl: false
            })
        }));

        require('./routes')(app, mainDb);

        server.listen(app.get('port'), function () {
            console.log("Express server listening on port " + app.get('port'));
            console.log("HOST: " + process.env.HOST);
            console.log("DATABASE: " + process.env.DB_NAME);
        });
    });

    return app;
};
