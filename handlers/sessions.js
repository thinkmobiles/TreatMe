var CONSTANTS = require('../constants');

var Session = function () {

    'use strict';

    this.register = function (req, res, userId, isNew, status) {
        req.session.loggedIn = true;
        req.session.uId = userId;
        req.session.uStatus = status;

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
        if (req.session && req.session.uId && req.session.loggedIn && req.session.uStatus) {
            next();
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            next(err);
        }

    };

    this.isBusiness = function(req, res, next){
        if (req.session && req.session.uStatus === CONSTANTS.USER_STATUS.BUSINESS){
            next();
        } else {
            var err = new Error('Not business');
            err.status = 400;
            next(err);
        }
    };

    this.isClient = function(req, res, next){
        if (req.session && req.session.uStatus === CONSTANTS.USER_STATUS.CLIENT){
            next();
        } else {
            var err = new Error('Not client');
            err.status = 400;
            next(err);
        }
    };

};

module.exports = Session;