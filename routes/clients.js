var express = require('express');
var router = express.Router();
var ClientsHandler = require('../handlers/clients');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var clientsHandler = new ClientsHandler(app, db);
    var sessionHandler = new SessionHandler();

    router.post('/signIn', clientsHandler.signIn);
    router.post('/signUp', clientsHandler.signUp);
    router.get('/signOut', clientsHandler.signOut);

    router.post('/forgotPassword', clientsHandler.forgotPassword);

    router.get('/confirm/:token', clientsHandler.confirmRegistration);
    router.get('/passwordChange/', clientsHandler.confirmForgotPass);
    router.post('/passwordChange/:forgotToken', clientsHandler.changePassword);

    return router;
};

