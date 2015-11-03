var express = require('express');
var router = express.Router();
var ClientsHandler = require('../handlers/clients');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var clientsHandler = new ClientsHandler(app, db);
    var sessionHandler = new SessionHandler();

    /*router.post('/signIn', clientsHandler.signIn);
    router.post('/signUp', clientsHandler.signUp);
    router.get('/signOut', clientsHandler.signOut);

    router.post('/forgotPassword', clientsHandler.forgotPassword);
    router.get('/confirm/:token', clientsHandler.confirmRegistration);

    router.get('/passwordChange/:forgotToken', clientsHandler.confirmForgotPass);
    router.post('/passwordChange/:forgotToken', clientsHandler.changePassword);*/

    //router.get('/gallery', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.getGalleryPhotoes);
    router.get('/subscriptions/:id?', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.getActiveSubscriptions);
    //router.get('/appointment', sessionHandler.authenticatedUser, clientsHandler.getAllClientAppointments);
    //router.get('/appointment/:id', sessionHandler.authenticatedUser, clientsHandler.getClientAppointmentById);

    //router.get('/:id?', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.getProfile);

    //router.put('/coordinates', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.updateLocation);

    //router.put('/', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.updateProfile);

    //router.post('/avatar', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.uploadAvatar);
    //router.delete('/avatar', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.removeAvatar);

    router.post('/appointment', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.createAppointment);
    //router.post('/appointment/cancel', sessionHandler.authenticatedUser, clientsHandler.cancelByClient);
    router.post('/appointment/rate', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.rateAppointmentById);
    router.post('/gallery', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.addPhotoToGallery);

    //router.delete('/gallery/:id', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.removePhotoFromGallery);

    return router;
};

