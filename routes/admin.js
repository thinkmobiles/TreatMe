var express = require('express');
var router = express.Router();
var AdminHandler = require('../handlers/admin');
var SessionHandler = require('../handlers/sessions');

module.exports = function(db){
    var admin = new AdminHandler(db);
   // var sessionHandler = new SessionHandler();

    router.get('/services/:page?', admin.getRequestedService);
    router.post('/services', admin.approveService);

    return router;
};
