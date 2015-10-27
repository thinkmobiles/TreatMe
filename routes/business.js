var express = require('express');
var router = express.Router();
var BusinessHandler = require('../handlers/business');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var businessHandler = new BusinessHandler(app, db);
    var sessionHandler = new SessionHandler();

    router.post('/signIn', businessHandler.signIn);
    router.post('/signUp', businessHandler.signUp);
    router.get('/signOut', businessHandler.signOut);

    router.post('/forgotPassword', businessHandler.forgotPassword);

    router.get('/confirm/:token', businessHandler.confirmRegistration);
    router.get('/passwordChange/', businessHandler.confirmForgotPass);
    router.post('/passwordChange/:forgotToken', businessHandler.changePassword);

    router.get('/details/personal', sessionHandler.authenticatedUser, businessHandler.getStylistInfo);
    router.get('/details/salon', sessionHandler.authenticatedUser, businessHandler.getSalonInfo);
    router.put('/personal', sessionHandler.authenticatedUser, businessHandler.updatePersonalInfo);
    router.put('/salon', sessionHandler.authenticatedUser, businessHandler.updateSalonInfo);
    router.put('/avatar', sessionHandler.authenticatedUser, businessHandler.uploadStylistAvatar);

    router.get('/services', sessionHandler.authenticatedUser, businessHandler.getBusinessService);
    router.get('/services/:id', sessionHandler.authenticatedUser, businessHandler.sendRequestForService);
    return router;
};
