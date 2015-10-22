var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var CONSTANTS = require('../constants');

var ClientsHandler = function (app, db) {

    var Client = db.model('Client');
    var session = new SessionHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signIn = function(req, res, next){

        var options = req.body;

        var fbId;
        var email;
        var password;

        if (options.fbId) {

            fbId = options.fbId;

            Client
                .findOne({fbId: fbId}, function (err, clientModel) {
                    var clientId;

                    if (err) {
                        return next(err);
                    }

                    if (!clientModel) {
                        return next(badRequests.SignInError());
                    }

                    clientId = clientModel.get('_id');

                    session.register(req, res, clientId, false, CONSTANTS.USER_STATUS.CLIENT);
                });

        } else {

            if (!options.email || !options.password) {
                return next(badRequests.NotEnParams({reqParams: 'email and password or fbId'}));
            }

            email = options.email;
            password = getEncryptedPass(options.password);

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            Client
                .findOneAndUpdate({email: email, password: password}, {forgotToken: ''}, function (err, clientModel) {
                    var token;
                    var clientId;

                    if (err) {
                        return next(err);
                    }

                    if (!clientModel) {
                        return next(badRequests.SignInError());
                    }

                    token = clientModel.get('token');
                    clientId = clientModel.get('_id');

                    if (token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    session.register(req, res, clientId, false, CONSTANTS.USER_STATUS.CLIENT);
                });
        }
    };

    this.signUp = function (req, res, next) {

        var body = req.body;
        var token = uuid.v4();
        var email;
        var clientModel;
        var password;
        var name = 'User';
        var status;

        if (!body.password || !body.email || !body.status) {
            return next(badRequests.NotEnParams({reqParams: 'password or email or status'}));
        }

        status = body.status;

        if (status !== CONSTANTS.USER_STATUS.BUSINESS && status !== CONSTANTS.USER_STATUS.CLIENT){
            return next(badRequests.InvalidValue({value: status, param: 'status'}));
        }

        email = body.email;
        password = body.password;

        if (!validator.isEmail(email)) {
            return next(badRequests.InvalidEmail());
        }

        email = validator.escape(email);

        body.token = token;
        body.email = email;
        body.password = getEncryptedPass(password);

        clientModel = new Client(body);

        clientModel
            .save(function (err) {

                if (err) {
                    return next(err);
                }

                if (body.name) {
                    name = body.name;
                }

                mailer.confirmRegistration({
                    name: name,
                    email: body.email,
                    password: password,
                    token: token
                }, CONSTANTS.USER_STATUS.CLIENT.toLowerCase());

                res.status(200).send({success: 'User registered successfully'});

            });


    };

    this.confirmRegistration = function (req, res, next) {

        var token = req.params.token;

        Client
            .findOneAndUpdate({token: token}, {
                $set: {
                    token: '',
                    confirmed: new Date()
                }
            }, {new: true}, function (err, clientModel) {
                var clientId;

                if (err) {
                    return next(err);
                }

                if (!clientModel){
                    return next(badRequests.TokenWasUsed());
                }

                clientId = clientModel.get('_id');

                session.register(req, res, clientId, true);

            });


    };

    this.forgotPassword = function (req, res, next) {

        var body = req.body;
        var email;
        var forgotToken = uuid.v4();

        if (!body.email) {
            return next(badRequests.NotEnParams({params: 'email'}));
        }

        if (!validator.isEmail(body.email)) {
            return next(badRequests.InvalidEmail());
        }

        email = body.email;

        email = validator.escape(email);

        body.email = email;
        body.forgotToken = forgotToken;

        Client
            .findOneAndUpdate(
            {
                email: email
            }, {
                $set: {forgotToken: forgotToken}
            }, {
                new: true
            }, function (err, result) {

                if (err) {
                    return next(err);
                }

                if (!result){
                    return res.status(200).send({success: 'Check your email'});
                }

                mailer.forgotPassword(result.toJSON(), CONSTANTS.USER_STATUS.BUSINESS.toLowerCase());

                res.status(200).send({success: 'Check your email'});

            });

    };

    this.confirmForgotPass = function(req, res, next){
        var forgotToken = req.params.forgotToken;

        Client
            .findOneAndUpdate({forgotToken: forgotToken}, {forgotToken: ''}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Confirm change password'});

            });

    };

    this.changePassword = function (req, res, next) {

        var forgotToken = req.params.forgotToken;
        var body = req.body;
        var encryptedPassword;

        if (!body.password){
            return next(badRequests.NotEnParams({params: 'password'}));
        }

        encryptedPassword = getEncryptedPass(body.password);

        Client
            .findOneAndUpdate({forgotToken: forgotToken}, {password: encryptedPassword, forgotToken: ''}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Password changed successfully'});

            });

    };

    this.signOut = function(req, res, next){

        session.kill(req, res, next);
    };

};

module.exports = ClientsHandler;

