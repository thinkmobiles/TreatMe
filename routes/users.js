var express = require('express');
var router = express.Router();
var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var userHandler = new UserHandler(app, db);
    var sessionHandler = new SessionHandler();

    router.post('/signUp', userHandler.signUp);
    router.post('/forgotPassword', userHandler.forgotPassword);

    router.get('/confirm/:token', userHandler.confirmRegistration);
    //router.post('/passwordChange/:forgotToken', userHandler)

    return router;
};
