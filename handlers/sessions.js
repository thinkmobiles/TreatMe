var CONSTANTS = require('../constants');
var badRequests = require('../helpers/badRequests');

var Session = function (db) {
    'use strict';
    var User = db.model('User');
    var self = this;

    function checkApproval(userId, callback) {

        User
            .findOne({_id: userId}, {approved: 1}, function (err, resultModel) {

                if (err) {
                    return callback(err);
                }

                if (!resultModel) {
                    return callback(badRequests.DatabaseError());
                }

                callback(null, resultModel.approved);

            });

    }

    this.register = function (req, res, userId, isNew, role) {
        req.session.loggedIn = true;
        req.session.uId = userId;
        req.session.role = role;

        if (typeof isNew === 'boolean' && isNew) {
            return res.status(201).send({success: 'User created successful', id: userId});
        }

        res.status(200).send({success: "Login successful", id: userId});
    };

    this.kill = function (req, res, next) {
        if (req.session) {
            req.session.destroy();
        }
        res.status(200).send({success: "Logout successful"});
    };

    this.isAuthenticate = function (req, cb) {
        if (req.session && req.session.uId && req.session.loggedIn && req.session.role) {
            cb();
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            cb(err);
        }

    };

    this.isStylist = function (req, res, next) {

        self.isAuthenticate(req, function (err) {
            if (err) {
                return next(err);
            }

            if (req.session.role === CONSTANTS.USER_ROLE.STYLIST) {

                checkApproval(req.session.uId, function (err, approved) {
                    if (err) {
                        return next(err);
                    }

                    if (!approved) {
                        err = new Error('Your account must be approved by admin');
                        err.status = 403;
                        return next(err);
                    }
                    next();
                });

            } else {
                next(badRequests.AccessError({'message': 'Only Stylist does have permissions for do this'}));
            }
        });

    };

    this.isClient = function (req, res, next) {

        self.isAuthenticate(req, function (err) {

            if (err) {
                return next(err);
            }

            if (req.session.role === CONSTANTS.USER_ROLE.CLIENT) {
                next();
            } else {
                next(badRequests.AccessError({'message': 'Only Client does have permissions for do this'}));
            }
        });

    };

    this.isAdmin = function (req, res, next) {

        self.isAuthenticate(req, function (err) {

            if (err) {
                return next(err);
            }

            if (req.session.role === CONSTANTS.USER_ROLE.ADMIN) {
                next();
            } else {
                next(badRequests.AccessError({'message': 'Only Admin does have permissions for do this'}));
            }
        });

    };

    this.clientOrStylist = function (req, res, next) {

        self.isAuthenticate(req, function (err) {

            if (err) {
                return next(err);
            }

            if (req.session.role === CONSTANTS.USER_ROLE.CLIENT || req.session.role === CONSTANTS.USER_ROLE.STYLIST) {
                next();
            } else {
                next(badRequests.AccessError({'message': 'Only Client or Stylist does have permissions for do this'}));
            }

        });

    };

    this.clientOrAdmin = function (req, res, next) {

        self.isAuthenticate(req, function (err) {

            if (err) {
                return next(err);
            }

            if (req.session.role === CONSTANTS.USER_ROLE.CLIENT || req.session.role === CONSTANTS.USER_ROLE.ADMIN) {
                next();
            } else {
                next(badRequests.AccessError({'message': 'Only Client or Admin does have permissions for do this'}));
            }
        });

    };

    this.stylistOrAdmin = function (req, res, next) {

        self.isAuthenticate(req, function (err) {

            if (err) {
                return next(err);
            }


            if (req.session.role === CONSTANTS.USER_ROLE.STYLIST) {
                checkApproval(req.session.uId, function (err, approved) {
                    if (err) {
                        return next(err);
                    }

                    if (!approved) {
                        err = new Error('Your account must be approved by admin');
                        err.status = 403;
                        return next(err);
                    }

                    next();
                });
            } else if (req.session.role === CONSTANTS.USER_ROLE.ADMIN) {
                next()
            } else {
                next(badRequests.AccessError({'message': 'Only Stylist or Admin does have permissions for do this'}));
            }
        });

    };

    this.authenticatedUser = function(req, res, next){
        self.isAuthenticate(req, function(err){
            if (err){
                return next(err);
            }

            next();
        })
    }
};

module.exports = Session;