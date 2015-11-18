
/**
 * @description Stylist management module
 * @module Stylist
 *
 */

var express = require('express');
var router = express.Router();
var StylistHandler = require('../handlers/stylist');
var SessionHandler = require('../handlers/sessions');
var AdminHandler = require('../handlers/admin');
var UserHandler = require('../handlers/users');

module.exports = function(app, db){
    var stylistHandler = new StylistHandler(app, db);
    var sessionHandler = new SessionHandler(db);
    var user = new UserHandler(app, db);
    var adminHandler = new AdminHandler(app, db);

    /**
     * __Type__ __`GET`__
     *
     * __Content-Type__ `application/json`
     *
     * __HOST: `http://projects.thinkmobiles.com:8871`__
     *
     * __URL: `/stylist/services/`__
     *
     * This __method__ allows get services by _Stylist_
     *
     * @example Request example:
     *         http://projects.thinkmobiles.com:8871/stylist/services/
     *
     * @example Response example:
     *
     *  Response status: 200
     *
     * [
     *        {
     *            "id": "5638ccde3624f77b33b6587d",
     *            "name": "Manicure",
     *            "logo": "http://192.168.88.78:8871/uploads/development/images/5638ccde3624f77b33b6587c.png",
     *            "status": "new"
     *        }
     *   ]
     *
     * @method getStylistServices
     * @instance
     */

    router.get('/services/', sessionHandler.authenticatedUser, sessionHandler.isStylist, user.getStylistServices);

    /**
     * __Type__ __`GET`__
     *
     * __Content-Type__ `application/json`
     *
     * __HOST: `http://projects.thinkmobiles.com:8871`__
     *
     * __URL: `/stylist/services/request/:serviceId`__
     *
     * This __method__ allows _Stylist_ send request for some services to _Admin_
     *
     * @example Request example:
     *         http://projects.thinkmobiles.com:8871/stylist/services/request/5638ccde3624f77b33b6587d
     *
     * @example Response example:
     *
     * {"success": "request succeed"}
     *
     * @method sendRequestForService
     * @instance
     */

    router.get('/services/request/:serviceId', sessionHandler.isStylist, stylistHandler.sendRequestForService);

    router.get('/appointment/start/:id', sessionHandler.isStylist, sessionHandler.isApprovedStylist, stylistHandler.startAppointmentById);
    router.get('/appointment/finish/:id', sessionHandler.isStylist, sessionHandler.isApprovedStylist, stylistHandler.finishAppointmentById);
    router.get('/appointment/accept/:id', sessionHandler.isStylist, sessionHandler.isApprovedStylist, stylistHandler.acceptAppointmentById);

    router.put('/availability', sessionHandler.isStylist, stylistHandler.updateAvailabilityHours);

    router.put('/online', sessionHandler.isStylist, stylistHandler.changeOnlineStatus);
    //router.get('/appointment/:id', sessionHandler.authenticatedUser, sessionHandler.isBusiness, businessHandler.getBusinessAppointmentById);

    return router;
};