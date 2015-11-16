var express = require('express');
var router = express.Router();
var ClientsHandler = require('../handlers/clients');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){
    var clientsHandler = new ClientsHandler(app, db);
    var sessionHandler = new SessionHandler(db);

    router.get('/subscriptions/current/:clientId?', sessionHandler.clientOrAdmin, clientsHandler.getCurrentSubscriptions);
    router.get('/subscriptions/', sessionHandler.isClient, clientsHandler.getActiveSubscriptionsOnServices);
    router.post('/subscriptions/:clientId?', sessionHandler.clientOrAdmin, clientsHandler.buySubscriptionsByClient);

    router.post('/appointment', sessionHandler.clientOrAdmin, clientsHandler.createAppointment);
    router.post('/appointment/rate', sessionHandler.isClient, clientsHandler.rateAppointmentById);

    router.post('/gallery',  sessionHandler.clientOrAdmin, clientsHandler.addPhotoToGallery);

    router.post('/card', sessionHandler.isClient, clientsHandler.addCardInfo);
    router.get('/card', sessionHandler.isClient, clientsHandler.getListCards);
    router.put('/card/:cardId', sessionHandler.isClient, clientsHandler.updateCard);
    router.delete('/card/:cardId', sessionHandler.isClient, clientsHandler.removeCard);

    return router;
};

