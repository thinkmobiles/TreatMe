
var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');

var UserHandler = function(app, db){

    var User = db.model('User');
    var session = new SessionHandler();

    this.signUp = function(req, res, next){

        var body = req.body;
        var token = uuid.v4();
        var email;
        var userModel;
        var shaSum = crypto.createHash('sha256');
        var password;
        var name = 'User';

        if (!body.password || !body.email ){
            return next(badRequests.NotEnParams({reqParams: 'password or email'}));
        }

        email = body.email;
        password = body.password;

        shaSum.update(password);


        if (!validator.isEmail(email)){
            return next(badRequests.InvalidEmail());
        }


        email = validator.escape(email);

        body.token = token;
        body.email = email;
        body.password = shaSum.digest('hex');

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


    }

};

module.exports = UserHandler;
