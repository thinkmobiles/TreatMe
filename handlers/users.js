
var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');

var UserHandler = function(app, db){

    var User = db.model('User');
    var session = new SessionHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signUp = function(req, res, next){

        var body = req.body;
        var token = uuid.v4();
        var email;
        var userModel;
        var password;
        var name = 'User';

        if (!body.password || !body.email ){
            return next(badRequests.NotEnParams({reqParams: 'password or email'}));
        }

        email = body.email;
        password = body.password;

        if (!validator.isEmail(email)){
            return next(badRequests.InvalidEmail());
        }

        email = validator.escape(email);

        body.token = token;
        body.email = email;
        body.password = getEncryptedPass(password);

        userModel = new User(body);

        userModel
            .save(function(err){

                if (err){
                    return next(err);
                }

                if (body.name){
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

    this.confirmRegistration = function(req, res, next){

        var token =  req.params.token;
        var uId;

        User
            .findOne({token: token}, function(err, userModel){

                if (err){
                    return next(err);
                }

                uId = userModel.get('_id');

                userModel
                    .update({$set: {token: '', confirmed: new Date()}}, function(err){

                        if (err){
                            return next(err);
                        }

                        session.register(req, res, uId, true);

                    });

            });

    };

    this.forgotPassword = function(req, rea, next){


    };

    this.signIn = function(req, res, next){
        var options = req.body;
        var email;
        var password;
        var fbId;

        if (options.fbId){

            fbId = options.fbId;

            User
                .findOne({fbId:fbId}, function(err, userModel){
                    if (err) {
                        return next(err);
                    }

                    if (!userModel){
                        return next(badRequests.NotFound({target: 'User'}));
                    }

                    session.register(req, res, userModel._id);
                });

        } else {

            if (!options.email || !options.password){
                return next(badRequests.NotEnParams({reqParams: 'email and password or fbId'}));
            }

            email = options.email;
            password = getEncryptedPass(options.password);

            if (!validator.isEmail(email)){
                return next(badRequests.InvalidEmail());
            }

            User
                .findOne({email: email, password: password}, function(err, userModel){
                    if (err) {
                        return next(err);
                    }

                    if (!userModel){
                        return next(badRequests.InvalidValue({param: 'email or password'}));
                    }

                    session.register(req, res, userModel._id);
                });
        }
    };

};

module.exports = UserHandler;
