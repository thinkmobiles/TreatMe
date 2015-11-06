var express = require('express');
var router = express.Router();
var StylistHandler = require('../handlers/stylist');
var SessionHandler = require('../handlers/sessions');
var AdminHandler = require('../handlers/admin');

module.exports = function(app, db){
    var stylistHandler = new StylistHandler(app, db);
    var sessionHandler = new SessionHandler(db);
    var adminHandler = new AdminHandler(db);

    router.get('/services/', sessionHandler.authenticatedUser, sessionHandler.isStylist, adminHandler.getServices);
    router.get('/services/request/:serviceId', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.sendRequestForService);

    //router.post('/appointment/cancel', sessionHandler.authenticatedUser, sessionHandler.isStylist, businessHandler.cancelByStylist);
    //router.get('/appointment', sessionHandler.authenticatedUser, sessionHandler.isBusiness, businessHandler.getAllStylistAppointments);
    router.get('/appointment/start/:id', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.startAppointmentById);
    router.get('/appointment/finish/:id', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.finishAppointmentById);
    router.get('/appointment/accept/:id', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.acceptAppointmentById);

    router.put('/availability', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.updateAvailabilityHours);

    router.post('/checkTest', stylistHandler.checkTest);

    router.put('/online', sessionHandler.authenticatedUser, sessionHandler.isStylist, stylistHandler.changeOnlineStatus);
    //router.get('/appointment/:id', sessionHandler.authenticatedUser, sessionHandler.isBusiness, businessHandler.getBusinessAppointmentById);

    return router;
};