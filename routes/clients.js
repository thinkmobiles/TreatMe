var express = require('express');
var router = express.Router();
var ClientsHandler = require('../handlers/clients');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var clientsHandler = new ClientsHandler(app, db);
    var sessionHandler = new SessionHandler(db);

    router.get('/subscriptions/current/:clientId?', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.getCurrentSubscriptions);
    router.get('/subscriptions/', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.getActiveSubscriptionsOnServices);
    router.post('/subscriptions/:clientId?', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.buySubscriptions);

    router.post('/appointment', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.createAppointment);
    router.post('/appointment/rate', sessionHandler.authenticatedUser, sessionHandler.isClient, clientsHandler.rateAppointmentById);

    router.post('/gallery', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, clientsHandler.addPhotoToGallery);

    return router;
};

