var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){
    var admin = new AdminHandler(db);
    var sessionHandler = new SessionHandler();

    router.get('/services/requested', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getRequestedService);
    router.post('/services/approve', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveService);

    // CRUD Services
    router.post('/services', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.addService);
    router.get('/services/:id?', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getServices);
    router.put('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateService);
    router.delete('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeService);

    // CRUD Stylists
    router.get('/stylist', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistList);
    router.get('/stylist/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistById);
    router.post('/stylist', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.createStylist);
    router.delete('/stylist', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeStylist);

    router.get('/count', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getCountByCriterion);

    router.post('/stylist/approve/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveStylist);
    router.post('/stylist/suspend/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendStylists);

    // CRUD Clients
    router.get('/client', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientList);
    router.get('/client/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientById);
    router.put('/client', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateClient);
    router.post('/client', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.createClient);
    router.delete('/client', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeClient);

    router.post('/client/suspend', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendClient);
    router.post('/client/activate', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.activateClient);

    router.post('/appointments', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.bookAppointment);
    router.put('/appointments', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendAppointments);
    router.delete('/appointments', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeAppointments);

    // CRUD SubscriptionType
    router.get('/subscriptionType', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getSubscriptionType);
    router.post('/subscriptionType', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.addSubscriptionType);
    router.put('/subscriptionType/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateSubscriptionType);
    router.delete('/subscriptionType/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeSubscriptionType);

    router.get('/subscriptions', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientPackages);
    router.delete('/subscriptions', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeSubscriptions);

    return router;
};
