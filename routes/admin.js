var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){
    var admin = new AdminHandler(db);
    var sessionHandler = new SessionHandler();

    router.post('/services', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.addService);
    router.get('/services', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getServices);
    router.put('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.updateService);
    router.delete('/services/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.removeService);

    router.get('/stylist', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistList);
    router.get('/stylist/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getStylistById);
    router.get('/stylist/approve/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveStylist);
    router.post('/stylist', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.createStylist);

    router.get('/services/:page?', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.getRequestedService);
    router.post('/services/approve', sessionHandler.authenticatedUser, sessionHandler.isAdmin, admin.approveService);

    return router;
};
