var CONSTANTS = require('../constants');
var badRequests = require('../helpers/badRequests');

var Session = function () {

    'use strict';

    this.register = function (req, res, userId, isNew, role) {
        req.session.loggedIn = true;
        req.session.uId = userId;
        req.session.role = role;

        if (typeof isNew === 'boolean' && isNew) {
            return res.status(201).send({success: 'User created successful'});
        }

        res.status(200).send({success: "Login successful"});
    };

    this.kill = function (req, res, next) {
        if (req.session) {
            req.session.destroy();
        }
        res.status(200).send({success: "Logout successful"});
    };

    this.authenticatedUser = function (req, res, next) {
        if (req.session && req.session.uId && req.session.loggedIn && req.session.role) {
            next();
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            next(err);
        }

    };

    this.isStylist = function(req, res, next){
        if (req.session && req.session.role === CONSTANTS.USER_ROLE.STYLIST){
            next();
        } else {
            next(badRequests.AccessError({'message': 'Only Stylist does have permissions for do this'}));
        }
    };

    this.isClient = function(req, res, next){
        if (req.session && req.session.role === CONSTANTS.USER_ROLE.CLIENT){
            next();
        } else {
            next(badRequests.AccessError({'message': 'Only Client does have permissions for do this'}));
        }
    };

    this.isAdmin = function(req, res, next){
        if (req.session && req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            next();
        } else {
            next(badRequests.AccessError({'message': 'Only Admin does have permissions for do this'}));
        }
    }


};

module.exports = Session;