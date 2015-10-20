var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');

var UserHandler = function (app, db) {

    var User = db.model('User');
    var session = new SessionHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signUp = function (req, res, next) {

        var body = req.body;
        var token = uuid.v4();
        var email;
        var userModel;
        var password;
        var name = 'User';

        if (!body.password || !body.email) {
            return next(badRequests.NotEnParams({reqParams: 'password or email'}));
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

        userModel = new User(body);

        userModel
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
                });

                res.status(200).send({success: 'User registered successfully'});

            });


    };

    this.confirmRegistration = function (req, res, next) {

        var token = req.params.token;
        var uId;

        User
            .findOneAndUpdate({token: token}, {
                $set: {
                    token: '',
                    confirmed: new Date()
                }
            }, {new: true}, function (err, userModel) {

                if (err) {
                    return next(err);
                }

                uId = userModel.get('_id');

                session.register(req, res, uId, true);

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

        User
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

                mailer.forgotPassword(result.toJSON());

                res.status(200).send({success: 'Check your email'});

            });

    };

    this.confirmForgotPass = function(req, res, next){
        var forgotToken = req.params.forgotToken;

        User
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
        var encryptedConfirmPassword;
        var err;

        if (!body.password || !body.confirmPassword){
            return next(badRequests.NotEnParams({params: 'password or confirmPassword'}));
        }

        encryptedPassword = getEncryptedPass(body.password);
        encryptedConfirmPassword = getEncryptedPass(body.confirmPassword);

        if (encryptedPassword !== encryptedConfirmPassword){
            err = new Error('Password and Confirmpassword doesn\'t much');
            err.status = 400;
            return next(err);
        }

        User
            .findOneAndUpdate({forgotToken: forgotToken}, {password: encryptedPassword, forgotToken: ''}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Password changed successfully'});

            });

    };

    this.signIn = function (req, res, next) {
        var options = req.body;
        var email;
        var password;
        var fbId;

        if (options.fbId) {

            fbId = options.fbId;

            User
                .findOne({fbId: fbId}, function (err, userModel) {
                    if (err) {
                        return next(err);
                    }

                    if (!userModel) {
                        return next(badRequests.NotFound({target: 'User'}));
                    }

                    session.register(req, res, userModel._id);
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

            User
                .findOneAndUpdate({email: email, password: password}, {forgotToken: ''}, function (err, userModel) {

                    var model;

                    if (err) {
                        return next(err);
                    }


                    if (!userModel) {
                        return next(badRequests.SignInError());
                    }

                    model = userModel.toJSON();

                    if (model.token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    session.register(req, res, userModel._id);
                });
        }
    };

    this.signOut = function(req, res, next){

        session.kill(req, res, next);
    };

};

module.exports = UserHandler;