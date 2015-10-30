
/**
 * @description Business profile management module
 * @module businessProfile
 *
 */

var mailer = require('../helpers/mailer')();
var mongoose = require('mongoose');
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var CONSTANTS = require('../constants');
var async = require('async');
var ImageHandler = require('./image');
var _ = require('lodash');
var ObjectId = mongoose.Types.ObjectId;


var UserHandler = function (app, db) {

    var self = this;
    var User = db.model('User');
    var Appointment = db.model('Appointment');
    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');

    var session = new SessionHandler();
    var image = new ImageHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signUp = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/signUp/`__
         *
         * This __method__ allows signUp _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/signUp/
         *
         * @example Body example:
         *
         * If you want signUp via Facebook
         * {
         *      "fbId": "test1",
         *      "name": "Test"
         * }
         *
         * If you want signUp via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty",
         *      "firstName": "Test",
         *      "lastName": "Test",
         * }
         *
         * @example Response example:
         *
         * Response status: 201
         *
         * For signUp via Facebook
         *  {
         *      "success": "Business created successful"
         *  }
         *
         *  For signUp via Email
         *
         *  {
         *      "success": "Business created successful. For using your account you must verify it. Please check email."
         *  }
         *
         * @param {string} [fbId] - FaceBook Id for signing user
         * @param {string} [email] - `Business` email
         * @param {string} password - `Business` password
         * @param {string} firstName - `Business` firstName
         * @param {string} lastName - `Business` lastName
         *
         * @method signUp
         * @instance
         */

        var body = req.body;
        var token = uuid.v4();
        var email;
        var userModel;
        var password;
        var createObj;

        if (!body.role){
            return next(badRequests.NotEnParams({reqParams: 'Role'}));
        }

        if (body.fbId){
            
            User
                .findOne({fbId: body.fbId, role: body.role}, function(err, resultModel){
                    
                    if (err){
                        return next(err);
                    }
                    
                    if (resultModel){
                        return next(badRequests.FbIdInUse());
                    }

                    userModel = new User(body);

                    userModel
                        .save(function (err) {

                            if (err) {
                                return next(err);
                            }

                            if (body.name) {
                                name = body.name;
                            }

                            //res.status(200).send({success: 'User registered successfully'});
                            session.register(req, res, user._id, true, CONSTANTS.USER_ROLE.STYLIST);

                        });

                    
                });

        } else {
            if (!body.password || !body.email || !body.firstName || !body.lastName || !body.phone) {
                return next(badRequests.NotEnParams({reqParams: 'password or email or First name or Last name'}));
            }

            email = body.email;
            password = body.password;

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            email = validator.escape(email);

            createObj = {
                personalInfo: {
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                },
                email: email,
                password: getEncryptedPass(password),
                token: token,
                role: body.role
            };

            User
                .findOne({email: createObj.email, role: body.role}, function(err, resultModel){

                    if (err){
                        return next(err);
                    }

                    if (resultModel){
                        return next(badRequests.EmailInUse());
                    }

                    user = new User(createObj);

                    user
                        .save(function (err) {

                            if (err) {
                                return next(err);
                            }

                            if (body.name) {
                                name = body.name;
                            }

                            mailer.confirmRegistration({
                                name: body.firstName + ' ' + body.lastName,
                                email: body.email,
                                password: password,
                                token: token
                            });

                            res.status(200).send({success: 'User created successful. For using your account you must verify it. Please check email.'});

                        });

                });

        }
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

                if (!userModel){
                    return next();
                }

                uId = userModel.get('_id');

                session.register(req, res, uId, true, CONSTANTS.USER_ROLE.STYLIST);

            });


    };

};

module.exports = UserHandler;
