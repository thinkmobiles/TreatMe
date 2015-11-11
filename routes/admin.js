var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){

    'use strict';

    var admin = new AdminHandler(db);
    var sessionHandler = new SessionHandler(db);
    var user = new UserHandler(null, db);

    router.get('/services/requested/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getRequestedService);
    router.post('/services/approve/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveService);

    // CRUD Services
    router.post('/services/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.addService);
    router.get('/services/:id?', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getServices);
    router.put('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateService);
    router.delete('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeService);

    //router.get('/stylist/count', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistCount);

    // CRUD Stylists
    router.get('/stylist/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistList);
    router.get('/stylist/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistById);
    router.post('/stylist/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.createStylist);
    router.put('/stylist/:userId', sessionHandler.authenticatedUser, sessionHandler.isAdmin, user.updateUserProfile);

    router.delete('/stylist/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeStylist);
    //router.get('/client/count/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientCount);

    router.post('/stylist/approve/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveStylist);

    //suspend and activate clients or stylists
    router.post('/suspend/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendUsers);
    router.post('/activate/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.activateUsers);

    // CRUD Clients
    router.get('/client/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientList);
    router.get('/client/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientById);
    router.put('/client/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateClient);
    router.post('/client/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.createClient);

    router.delete('/user/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeUserById);

    router.get('/subscriptions/:clientId', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientSubscriptions);

    router.get('/appointments/:clientId', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getBookedAppointment);
    router.post('/appointments/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.bookAppointment);
    router.put('/appointments/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendAppointments);
    router.delete('/appointments/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeAppointments);

    // CRUD SubscriptionType
    router.get('/subscriptionType/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getSubscriptionType);
    router.post('/subscriptionType/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.addSubscriptionType);
    router.put('/subscriptionType/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateSubscriptionType);
    router.delete('/subscriptionType/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeSubscriptionType);

    router.get('/packages/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getClientPackages);
    router.delete('/packages/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removePackages);

    return router;
};
