var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){
    var admin = new AdminHandler(db);
    var sessionHandler = new SessionHandler();

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

    router.post('/stylist/approve/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveStylist);
    router.post('/stylist/suspend/', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.suspendStylists);

    router.get('/services/requested', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getRequestedService);
    router.post('/services/approve', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveService);

    return router;
};
