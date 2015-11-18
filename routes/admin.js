var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');

module.exports = function(app, db){

    'use strict';

    var admin = new AdminHandler(app, db);
    var sessionHandler = new SessionHandler(db);
    var user = new UserHandler(null, db);

    router.get('/services/requested/', sessionHandler.isAdmin, admin.getRequestedService);
    router.post('/services/approve/', sessionHandler.isAdmin, admin.approveService);

    // CRUD Services
    router.post('/services/', sessionHandler.isAdmin, admin.addService);
    router.get('/services/:id?', sessionHandler.isAdmin, admin.getServices);
    router.put('/services/:id', sessionHandler.isAdmin, admin.updateService);
    router.delete('/services/:id', sessionHandler.isAdmin, admin.removeService);

    // CRUD Stylists
    router.get('/stylist/', sessionHandler.isAdmin, admin.getStylistList);
    router.get('/stylist/location', sessionHandler.isAdmin, admin.getStylistsLocation);
    router.get('/stylist/:id', sessionHandler.isAdmin, admin.getStylistById);
    router.post('/stylist/', sessionHandler.isAdmin, admin.createStylist);
    router.put('/stylist/:userId', sessionHandler.isAdmin, user.updateUserProfile);

    router.delete('/stylist/', sessionHandler.isAdmin, admin.removeStylist);

    router.post('/stylist/approve/', sessionHandler.isAdmin, admin.approveStylist);

    //suspend and activate clients or stylists
    router.post('/suspend/', sessionHandler.isAdmin, admin.suspendUsers);
    router.post('/activate/', sessionHandler.isAdmin, admin.activateUsers);

    // CRUD Clients
    router.get('/client/', sessionHandler.isAdmin, admin.getClientList);
    router.get('/client/:id', sessionHandler.isAdmin, admin.getClientById);
    router.put('/client/', sessionHandler.isAdmin, admin.updateClient);
    router.post('/client/', sessionHandler.isAdmin, admin.createClient);

    router.delete('/user/:id', sessionHandler.isAdmin, admin.removeUserById);

    router.get('/subscriptions/:clientId', sessionHandler.isAdmin, admin.getClientSubscriptions);

    router.get('/stylistPayments/', sessionHandler.isAdmin, admin.getStylistPayments);

    router.get('/clients/:stylistId', sessionHandler.isAdmin, admin.getStylistClients);

    router.get('/appointments/:clientId', sessionHandler.isAdmin, admin.getBookedAppointment); //TODO: переробити і видалити, є метод який вертає всі юукед зустрічі
    router.post('/appointments/', sessionHandler.isAdmin, admin.bookAppointment);
    router.put('/appointments/', sessionHandler.isAdmin, admin.suspendAppointments);
    router.delete('/appointments/', sessionHandler.isAdmin, admin.removeAppointments);

    router.get('/packages/', sessionHandler.isAdmin, admin.getClientPackages);
    router.delete('/packages/', sessionHandler.isAdmin, admin.removePackages);

    router.get('/statistic/overview', sessionHandler.isAdmin, admin.getOverviewByPeriod);
    router.get('/statistic/appointments', sessionHandler.isAdmin, admin.getAppointmentsStatistic);

    return router;
};
