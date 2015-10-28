var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){
    var admin = new AdminHandler(db);
   // var sessionHandler = new SessionHandler();

    router.post('/services', admin.addService);
    router.get('/services', admin.getServices);
    router.put('/services/:id', admin.updateService);
    router.delete('/services/:id', admin.updateService);

    router.get('/stylist/:page?', admin.getRequestedStylists);
    router.get('/stylist/approve/:id', admin.approveStylist);

    router.get('/services/:page?', admin.getRequestedService);
    router.post('/services/approve', admin.approveService);

    return router;
};
