var express = require('express');
var router = express.Router();
var ClientsHandler = require('../handlers/clients');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var clientsHandler = new ClientsHandler(app, db);
    var sessionHandler = new SessionHandler();

    router.get('/subscriptions', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.getActiveSubscriptions);

    router.post('/appointment', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.createAppointment);
    router.post('/appointment/rate', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.rateAppointmentById);

    router.post('/gallery', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.addPhotoToGallery);

    return router;
};

