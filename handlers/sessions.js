var Session = function () {

    'use strict';

    this.register = function (req, res, userId, isNew) {
        req.session.loggedIn = true;
        req.session.uId = userId;

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
        if (req.session && req.session.uId && req.session.loggedIn) {
            next();
        } else {
            var err = new Error('UnAuthorized');
            err.status = 401;
            next(err);
        }

    };

};

module.exports = Session;