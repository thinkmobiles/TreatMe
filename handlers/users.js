
/**
 * @description User profile management module
 * @module userProfile
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
         * __URL: `/signUp/`__
         *
         * This __method__ allows signUp _Users_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/signUp/
         *
         * @example Body example:
         *
         * If you want signUp via Facebook
         * {
         *      "fbId": "test1",
         *      "role": "Stylist"
         * }
         *
         * If you want signUp via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty",
         *      "firstName": "Test",
         *      "lastName": "Test",
         *      "role": "Stylist",
         *      "phone": "911"
         * }
         *
         * @example Response example:
         *
         * Response status: 201
         *
         * For signUp via Facebook
         *  {
         *      "success": "User created successful"
         *  }
         *
         *  For signUp via Email
         *
         *  {
         *      "success": "User created successful. For using your account you must verify it. Please check email."
         *  }
         *
         * @param {string} [fbId] - FaceBook Id for signing User
         * @param {string} [email] - `User` email
         * @param {string} password - `User` password
         * @param {string} firstName - `User` firstName
         * @param {string} lastName - `User` lastName
         * @param {string} role - `User` role (Stylist or Client)
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
        var user;

        if (!body.role){
            return next(badRequests.NotEnParams({reqParams: 'Role'}));
        }

        if (role === 'Admin'){
            if (!body.email || !body.password){
                return next(badRequests.NotEnParams({reqParams: 'Email or password'}));
            }

            user = new User({email: body.email})

        } else {
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
        }


    };

    this.signOut = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/signOut/`__
         *
         * This __method__ allows signOut _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/signOut/
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Logout successful"
         *  }
         *
         * @method signOut
         * @instance
         */

        session.kill(req, res, next);
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

        User
            .findOneAndUpdate(
            {
                email: email
            }, {
                $set: {forgotToken: forgotToken}
            }, {
                new: true
            }, function (err, result) {
                var role;

                if (err) {
                    return next(err);
                }

                if (!result) {
                    return res.status(200).send({success: 'Check your email'});
                }

                if (result.role === CONSTANTS.USER_ROLE.CLIENT){
                    role = CONSTANTS.USER_ROLE.CLIENT;
                } else {
                    role = CONSTANTS.USER_ROLE.STYLIST;
                }

                mailer.forgotPassword(result.toJSON(), role);

                res.status(200).send({success: 'Check your email'});

            });

    };

    this.confirmForgotPass = function (req, res, next) {

        var forgotToken = req.query.token;
        var userRole = req.query.role;

        User
            .findOneAndUpdate({forgotToken: forgotToken, role: userRole}, {forgotToken: ''}, function (err, userModel) {
                if (err) {
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.TokenWasUsed());
                }

                res.status(200).send({success: 'Confirm change password'});
            });
    };

    this.changePassword = function (req, res, next) {

        var forgotToken;
        var userRole;
        var body = req.body;
        var encryptedPassword;

        if (!body.password || !body.token || !body.role) {
            return next(badRequests.NotEnParams({params: 'password'}));
        }

        forgotToken = req.body.token;
        userRole = req.body.role;

        encryptedPassword = getEncryptedPass(body.password);

        User
            .findOneAndUpdate({forgotToken: forgotToken, role: userRole}, {
                password: encryptedPassword,
                forgotToken: ''
            }, function (err, userModel) {

                if (err) {
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.TokenWasUsed());
                }

                res.status(200).send({success: 'Password changed successfully'});
            });

    };

    this.signIn = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/signIn/`__
         *
         * This __method__ allows signIn _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/signIn/
         *
         * @example Body example:
         *
         * If you want login via Facebook
         * {
         *      "fbId": "test1",
         *      "role": "Stylist"
         * }
         *
         * If you want login via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty",
         *      "role": "Stylist"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Login successful"
         *  }
         *
         * @param {string} [fbId] - FaceBook Id for signing `User`
         * @param {string} [email] - `User` email
         * @param {string} password - `User` password
         * @param {string} role - `User` role (Stylist or Client)
         *
         * @method signIn
         * @instance
         */

        var options = req.body;

        var fbId;
        var email;
        var password;
        var role;

        if (!options.role){
            return next(badRequests.NotEnParams({reqParams: 'Role'}));
        }

        if (options.fbId) {

            fbId = options.fbId;

            User
                .findOne({fbId: fbId}, function (err, userModel) {
                    if (err) {
                        return next(err);
                    }

                    if (!userModel) {
                        return next(badRequests.SignInError());
                    }

                    if (options.role === CONSTANTS.USER_ROLE.CLIENT){
                        role = CONSTANTS.USER_ROLE.CLIENT;
                    } else {
                        role = CONSTANTS.USER_ROLE.STYLIST;
                    }

                    session.register(req, res, userModel._id, false, role);
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
                .findOneAndUpdate({email: email, password: password}, {forgotToken: ''}, function (err, businessModel) {
                    var token;

                    if (err) {
                        return next(err);
                    }

                    if (!businessModel) {
                        return next(badRequests.SignInError());
                    }

                    token = businessModel.get('token');

                    if (token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    if (options.role === CONSTANTS.USER_ROLE.CLIENT){
                        role = CONSTANTS.USER_ROLE.CLIENT;
                    } else {
                        role = CONSTANTS.USER_ROLE.STYLIST;
                    }

                    session.register(req, res, businessModel._id, false, role);
                });
        }
    };


    this.updatePersonalInfo = function(req, res, next){

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details`__
         *
         * This __method__ allows add details for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details
         *
         * @example Body example:
         *
         * {
         *    "salonName": "Misha",
         *    "address": "Uzhgorod, Gvardijska 19",
         *    "state": "Zakarpatska",
         *    "zipCode": "88000",
         *    "phone": "+380968987567",
         *    "licenseNumber": "1224"
         * }
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "success": "Business details saved successful"
         * }
         *
         * @param {string} salonName - `Business` Salon Name
         * @param {string} address - `Business` Salon Address
         * @param {string} state - `Business` Salon State
         * @param {string} zipCode - `Business` Zip Code
         * @param {string} phone - `Business` Phone Number
         * @param {string} licenseNumber - `Business` License Number
         *
         * @method addBusinessDetails
         * @instance
         */

        var uId = req.session.uId;
        var role = req.session.role;
        var body = req.body;
        var personalInfo;

        if (!body){
            return next(badRequests.NotEnParams());
        }


        User
            .findOne({_id: uId}, {personalInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                personalInfo = (resultModel.toJSON()).personalInfo;

                if (body.firstName){
                    personalInfo.firstName = body.firstName;
                }

                if (body.lastName){
                    personalInfo.lastName = body.lastName;
                }

                if (body.profession && (role === CONSTANTS.USER_ROLE.STYLIST)){
                    personalInfo.profession = body.profession;
                }

                if (body.phone){
                    personalInfo.phone = body.phone;
                }

                if (body.facebookURL && (role === CONSTANTS.USER_ROLE.STYLIST)){
                    personalInfo.facebookURL = body.facebookURL;
                }

                resultModel.update({personalInfo: personalInfo}, function(err){

                    if (err){
                        return next(err);
                    }


                    res.status(200).send({success: 'Personal info updated successfully'});
                });

            });

    };

    this.updateSalonInfo = function(req, res, next){

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details`__
         *
         * This __method__ allows update details for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details
         *
         * @example Body example:
         *
         * {
         *    "salonName": "Misha",
         *    "address": "Uzhgorod, Gvardijska 19",
         *    "state": "Zakarpatska",
         *    "zipCode": "88000",
         *    "phone": "+380968987567",
         *    "licenseNumber": "1224"
         * }
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "success": "Business details saved successful"
         * }
         *
         * @param {string} [salonName] - `Business` Salon Name
         * @param {string} [address] - `Business` Salon Address
         * @param {string} [state] - `Business` Salon State
         * @param {string} [zipCode] - `Business` Zip Code
         * @param {string} [phone] - `Business` Phone Number
         * @param {string} [licenseNumber] - `Business` License Number
         *
         * @method updateBusinessDetails
         * @instance
         */

        var uId = req.session.uId;
        var body = req.body;
        var currentSalonDetails;

        User
            .findOne({_id: uId}, {salonInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                currentSalonDetails = resultModel.get('salonInfo');

                if (body.salonName){
                    currentSalonDetails.salonName = body.salonName;
                }

                if (body.yourBusinessRole){
                    currentSalonDetails.yourBusinessRole = body.yourBusinessRole;
                }

                if (body.phone){
                    currentSalonDetails.phone = body.phone;
                }

                if (body.email){
                    currentSalonDetails.email = body.email;
                }

                if (body.address){
                    currentSalonDetails.address = body.address;
                }

                if (body.state){
                    currentSalonDetails.state = body.state;
                }

                if (body.zipCode){
                    currentSalonDetails.zipCode = body.zipCode;
                }

                if (body.phone){
                    currentSalonDetails.phone = body.phone;
                }

                if (body.licenseNumber){
                    currentSalonDetails.licenseNumber = body.licenseNumber;
                }

                if (body.city){
                    currentSalonDetails.city = body.city;
                }

                if (body.country){
                    currentSalonDetails.country = body.country;
                }

                resultModel.update({salonInfo: currentSalonDetails}, function(err){

                    if (err){
                        return next(err);
                    }

                    res.status(200).send({success: 'Business details updated successful'});

                });

            });
    };

    this.getProfile = function (req, res, next) {
        var userId = req.params.id || req.session.uId;
        var projectionObj;

        if (req.params.id && !CONSTANTS.REG_EXP.OBJECT_ID.test(userId)) {
            return next(badRequests.InvalidValue({value: userId, param: 'id'}));
        }

        projectionObj = {
            fbId: 0,
            __v: 0,
            token: 0,
            password: 0,
            forgotToken: 0,
            confirmed: 0,
            approved:0
        };

        User
            .findOne({_id: userId}, projectionObj, function (err, clientModel) {

                if (err) {
                    return next(err);
                }
                if (!clientModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                res.status(200).send(clientModel);
            });
    };

    this.uploadAvatar = function(req, res, next){


        var body = req.body;
        var userId = req.session.uId;
        var imageName = image.createImageName();
        var currentImageName;
        var imageString;

        if (!body.avatar){
            return next(badRequests.NotEnParams({reqParams: 'avatar'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){

            if (!body.userId){
                return next(badRequests.NotEnParams({reqParams: 'userId'}));
            }
            userId = body.userId;
        }

        imageString = body.avatar;

        User
            .findOne({_id: userId}, {'personalInfo.avatar': 1}, function(err, userModel){

                if (err){
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.DatabaseError());
                }

                currentImageName = userModel.get('personalInfo.avatar');

                async
                    .series([

                        function(cb) {
                            image.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb){
                            userModel
                                .update({'personalInfo.avatar': imageName}, cb);
                        },

                        function(cb) {

                            if (!currentImageName){
                                return cb();
                            }

                            image.deleteImage(currentImageName, CONSTANTS.BUCKET.IMAGES, cb);
                        }

                    ], function(err){

                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'Avatar upload successful'});
                    });
            });
    };

    this.removeAvatar = function(req, res, next){
        var userId = req.session.uId;

        if (req.params.id && req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            userId = req.params.id;

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
                return next(badRequests.InvalidValue({value: userId, param: 'id'}));
            }
        }

        User
            .findOne({_id: userId}, function(err, userModel){
                var avatarName;

                if (err){
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.DatabaseError());
                }

                avatarName = userModel.get('personalInfo.avatar');

                userModel
                    .update({'personalInfo.avatar': ''}, function(err){
                        if (err){
                            return next(err);
                        }

                        if (!avatarName){
                            return res.status(200).send({success: 'Avatar removed successfully'});
                        }

                        image.deleteImage(avatarName, CONSTANTS.BUCKET.IMAGES, function(err){
                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'Avatar removed successfully'});
                        });
                    });
            });
    };

};

module.exports = UserHandler;
