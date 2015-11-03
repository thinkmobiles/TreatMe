
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
    var Gallery = db.model('Gallery');
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

    function getAllUserAppointments(userId, role, appointmentStatus, callback){
        var findObj = {};
        var projectionObj;
        var populateArray = [
            {path: 'serviceType', select: 'name'}
        ];

        if (role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = userId;
            projectionObj = {
                __v: 0,
                client: 0,
                clientLoc: 0,
                requestDate: 0,
                status: 0
            };
            populateArray.push({path: 'stylist', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName salonInfo.salonName'});
        }

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            findObj.stylist = userId;
            projectionObj = {
                __v: 0,
                stylist: 0,
                clientLoc: 0,
                requestDate: 0,
                status: 0
            };
            populateArray.push({path: 'client', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName'});
        }

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            if (appointmentStatus ===  CONSTANTS.STATUSES.APPOINTMENT.PENDING){
                findObj.status = {$in : [CONSTANTS.STATUSES.APPOINTMENT.CREATED, CONSTANTS.STATUSES.APPOINTMENT.SUSPENDED]}
            }

            if (appointmentStatus ===  CONSTANTS.STATUSES.APPOINTMENT.BOOKED){
                findObj.status = {$in : [
                    CONSTANTS.STATUSES.APPOINTMENT.CONFIRMED,
                    CONSTANTS.STATUSES.APPOINTMENT.BEGINS,
                    CONSTANTS.STATUSES.APPOINTMENT.SUCCEEDED,
                    CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_CLIENT,
                    CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_STYLIST
                ]}
            }

            projectionObj = {
                __v: 0,
                clientLoc: 0,
                requestDate: 0
            };

            populateArray.push(
                {path: 'client', select: 'personalInfo.firstName personalInfo.lastName'},
                {path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'}
            );
        }

        Appointment
            .find(findObj, projectionObj)
            .populate(populateArray)
            .sort({bookingDate: 1})
            .exec(function(err, appointmentModelsArray){
                var avatarName;

                if (err){
                    return callback(err);
                }

                appointmentModelsArray.map(function(appointmentModel){

                    if (role === CONSTANTS.USER_ROLE.CLIENT){
                        avatarName = appointmentModel.get('stylist.personalInfo.avatar');

                        if (avatarName){
                            appointmentModel.stylist.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                        }
                    } else {
                        avatarName = appointmentModel.get('client.personalInfo.avatar');

                        if (avatarName){
                            appointmentModel.client.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                        }
                    }
                });

                callback(null, appointmentModelsArray);
            });
    }

    function getUserAppointmentById(userId, appointmentId, role, callback){
        var populateArray = [{path: 'serviceType', select: 'name'}];
        var projectionObj;
        var findObj = {_id: appointmentId};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return callback(badRequests.InvalidValue({value: appointmentId, param: 'id'}));
        }

        if (role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = userId;
            projectionObj = {
                __v: 0,
                client: 0,
                clientLoc: 0,
                requestDate: 0,
                startDate: 0,
                endDate: 0,
                cancellationReason: 0,
                rate: 0,
                rateComment: 0
            };
            populateArray.push({path: 'stylist', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName salonInfo.salonName'});
        }

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            findObj.stylist = userId;
            projectionObj = {
                __v: 0,
                stylist: 0,
                clientLoc: 0,
                requestDate: 0,
                startDate: 0,
                endDate: 0,
                cancellationReason: 0,
                rate: 0,
                rateComment: 0
            };
            populateArray.push({path: 'client', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName'});
        }

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            projectionObj = {
                __v: 0,
                clientLoc: 0,
                status: 0,
                startDate: 0,
                endDate: 0,
                cancellationReason: 0,
                rate: 0,
                rateComment: 0,
                stylist: 0

            };
            populateArray.push({path: 'client', select: 'personalInfo.firstName personalInfo.lastName personalInfo.avatar personalInfo.phone'});
        }

        Appointment
            .findOne(findObj, projectionObj)
            .populate(populateArray)
            .exec(function(err, appointmentModel){
                var avatarName;

                if (err){
                    return callback(err);
                }

                if (!appointmentModel){
                    return callback(badRequests.NotFound({target: 'Appointment'}));
                }

                if (role === CONSTANTS.USER_ROLE.CLIENT){
                    avatarName = appointmentModel.get('stylist.personalInfo.avatar');

                    if (avatarName){
                        appointmentModel.stylist.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                    }
                } else {
                    avatarName = appointmentModel.get('client.personalInfo.avatar');

                    if (avatarName){
                        appointmentModel.stylist.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                    }
                }

                callback(null, appointmentModel);
            });
    }

    this.addStylistProfile = function(createObj, callback){

        var email = createObj.email;

        User
            .findOne({email: email, role: CONSTANTS.USER_ROLE.STYLIST}, {_id: 1}, function(err, resultModel){

                if (err){
                    return callback(err);
                }

                if (resultModel){
                    return callback(badRequests.EmailInUse());
                }

                var userModel = new User(createObj);

                userModel
                    .save(function(err){

                        if (err){
                            return callback(err);
                        }

                        callback(null);

                    });

            });
    };

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
         * @param {string} [fbId] - FaceBook Id for signup User
         * @param {string} [email] - `User` email
         * @param {string} password - `User` password
         * @param {string} firstName - `User` firstName
         * @param {string} lastName - `User` lastName
         * @param {string} phone - `User` phone
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

        if (body.role === 'Admin'){
            if (!body.email || !body.password){
                return next(badRequests.NotEnParams({reqParams: 'Email or password'}));
            }

            password = getEncryptedPass(body.password);

            User.findOne({email: body.email, password: password, role: CONSTANTS.USER_ROLE.ADMIN, approved: true}, function(err, result){

                if (err){
                    return next(err);
                }

                if (result){
                    return next(badRequests.EmailInUse());
                }

                user = new User({email: body.email, password: password, role: CONSTANTS.USER_ROLE.ADMIN, approved: true});

                user
                    .save(function(err){

                        if (err){
                            return next(err);
                        }

                        session.register(req, res, user._id, true, CONSTANTS.USER_ROLE.ADMIN);

                    });
            });

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
        var findObj;

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

                    role = userModel.get('role');

                    session.register(req, res, userModel._id, false, role);
                });

        } else {

            if (!options.email || !options.password) {
                return next(badRequests.NotEnParams({reqParams: 'email and password or fbId'}));
            }

            email = options.email;
            password = getEncryptedPass(options.password);

            if (options.role && options.role === CONSTANTS.USER_ROLE.ADMIN){
                findObj = {email: email, password: password, role: options.role};
            } else {
                findObj = {email: email, password: password}
            }

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            User
                .findOneAndUpdate(findObj, {forgotToken: ''}, function (err, userModel) {
                    var token;

                    if (err) {
                        return next(err);
                    }

                    if (!userModel) {
                        if (!options.role){
                            return next(badRequests.SignInError());
                        }

                        return next(badRequests.AccessError());
                    }

                    token = userModel.get('token');
                    role = userModel.get('role');

                    if (token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    /*if (options.role === CONSTANTS.USER_ROLE.CLIENT){
                        role = CONSTANTS.USER_ROLE.CLIENT;
                    } else {
                        role = CONSTANTS.USER_ROLE.STYLIST;
                    }*/

                    session.register(req, res, userModel._id, false, role);
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

    this.updateLocation = function (req, res, next) {
        var userId = req.session.uId;
        var body = req.body;
        var longitude;
        var latitude;
        var coordinates;
        var updateObj;

        if (!body.coordinates) {
            return next(badRequests.NotEnParams({reqParams: 'coordinates'}))
        }

        coordinates = body.coordinates;

        if (!Array.isArray(coordinates) || coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
            return next(badRequests.InvalidValue({value: coordinates, param: 'coordinates'}));
        }

        longitude = coordinates[0];
        latitude = coordinates[1];

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            return next(badRequests.InvalidValue({message: 'Longitude must be within (-180; 180). Latitude must be within (-90; 90) '}));
        }

        updateObj = {
            loc: {
                type: 'Point',
                coordinates: coordinates
            }
        };

        User
            .findOneAndUpdate({_id: userId}, updateObj, function (err, userModel) {
                if (err) {
                    return next(err);
                }

                if (!userModel) {
                    return next(badRequests.DatabaseError());
                }

                res.status(200).send({success: 'Coordinates updated successfully'});
            });
    };

    this.getGalleryPhotos = function(req, res, next){
        var userId = req.params.id;
        var findObj = {};
        var populateArray = [
            {path: 'appointment', select: 'bookingDate'},
            {path: 'appointment.serviceType', select: 'name'}
        ];

        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.clientId = req.session.uId;
            populateArray.push({path: 'appointment.stylist', select: 'salonInfo.salonName personalInfo.firstName personalInfo.lastName personalInfo.avatar'});
        }

        if (req.session.role === CONSTANTS.USER_ROLE.STYLIST){
            if (!userId){
                return next(badRequests.NotEnParams({reqParams: 'id'}));
            }

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
                return next(badRequests.InvalidValue({value: userId, param: 'id'}));
            }

            findObj.clientId = userId;
            findObj.stylistId = req.session.uId;
            populateArray.push({path: 'appointment.client', select: 'personalInfo.firstName personalInfo.lastName'});
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            populateArray.push(
                {path: 'appointment.stylist', select: 'personalInfo.firstName personalInfo.lastName'},
                {path: 'appointment.client', select: 'personalInfo.firstName personalInfo.lastName'}
            );
        }

        Gallery
            .find(findObj)
            .populate(populateArray)
            .exec(function(err, galleryModelsArray){
                if (err){
                    return next(err);
                }

                galleryModelsArray.map(function(model){
                    model.url = image.computeUrl(model._id, CONSTANTS.BUCKET.IMAGES);

                    return model;
                });

                res.status(200).send(galleryModelsArray);
            });
    };

    this.removePhotoFromGallery = function(req, res, next){
        var userId = req.session.uId;
        var imageName = req.params.id;
        var findObj = {_id: imageName};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(imageName)){
            return next(badRequests.InvalidValue({value: imageName, param: 'id'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.clientId = userId;
        }

        if (req.session.role === CONSTANTS.USER_ROLE.STYLIST){
            findObj.stylistId = userId;
        }

        async.waterfall([

            function(cb){
                Gallery
                    .findOne(findObj, function(err, imageModel){
                        if (err){
                            return cb(err);
                        }

                        if (!imageModel){
                            return cb(badRequests.NotFound({target: 'image'}));
                        }

                        cb(null, imageModel);
                    });
            },

            function(imageModel, cb){
                imageModel.remove(cb);
            },

            function(cb){
                image.deleteImage(imageName, CONSTANTS.BUCKET.IMAGES, cb);
            }

        ], function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Photo was removed from gallery'});
        });
    };

    this.getAppointments = function(req, res, next){
        var appointmentId = req.query.id;
        var appointmentStatus;
        var userId = req.session.uId;

        if (appointmentId){
            getUserAppointmentById(userId, appointmentId, req.session.role, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
        } else {
            if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
                appointmentStatus = req.query.status;

                if (!appointmentStatus){
                    return next(badRequests.NotEnParams({reqParams: 'status'}));
                }
            }

            getAllUserAppointments(userId, req.session.role, appointmentStatus, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
        }
    };

    this.cancelByUser = function(req, res, next){
        var userId = req.session.uId;
        var appointmentId = req.body.appointmentId;
        var cancellationReason = req.body.cancellationReason;
        var findObj = {_id: appointmentId};
        var updateObj;

        if (!appointmentId || !cancellationReason){
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and cancellationReason'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = userId;
            updateObj = {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_CLIENT, cancellationReason: cancellationReason}};
        }

        if (req.session.role === CONSTANTS.USER_ROLE.STYLIST){
            findObj.stylist = userId;
            updateObj = {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_STYLIST, cancellationReason: cancellationReason}};
        }

        Appointment
            .findOneAndUpdate(findObj, updateObj, function(err, appointmentModel){
                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment was canceled successfully'});
            });
    };

    this.getStylistServices = function(req, res, next){
        var role = req.session.role;
        var uId;

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            uId = req.session.uId;
        } else {
            if (!req.params.stylistId){
                return next(badRequests.NotEnParams({reqParams: 'stylistId'}));
            }

            uId = req.params.stylistId;
        }

        var ind;
        var allId;
        var stylistId;
        var serviceArray = [];
        var serviceObj;

        ServiceType.find({}, function(err, allServiceModels){

            if (err){
                return next(err);
            }

            Services
                .find({stylist: uId}, function(err, stylistServiceModel){

                    if (err){
                        return next(err);
                    }

                    allId = (_.pluck(allServiceModels, '_id')).toStringObjectIds();

                    stylistId = (_.pluck(stylistServiceModel, 'serviceId')).toStringObjectIds();

                    for (var i = 0, n = allServiceModels.length; i < n; i++){
                        ind = stylistId.indexOf(allId[i]);

                        if (ind !== -1){
                            serviceObj = {
                                id: stylistServiceModel[ind].serviceId,
                                name: stylistServiceModel[ind].name,
                                status: stylistServiceModel[ind].approved ? 'approved' : 'pending'
                            };

                            serviceArray.push(serviceObj);
                        } else {
                            serviceObj = {
                                id: allServiceModels[i]._id,
                                name: allServiceModels[i].name,
                                status: 'new'
                            };

                            serviceArray.push(serviceObj);
                        }

                    }

                    res.status(200).send(serviceArray);

                });

        });

    };

    this.sendRequestForService = function(req, res, next){

        var uId = req.session.uId;
        var serviceId = req.params.serviceId;
        var serviceModel;
        var name;
        var createObj;

        ServiceType.findOne({_id: serviceId}, {name: 1}, function(err, resultModel){

            if (err){
                return next(err);
            }

            if (!resultModel){
                return next(badRequests.DatabaseError());
            }

            name = resultModel.get('name');

            Services
                .findOne({stylist: ObjectId(uId), name: name}, function(err, resultModel){

                    if (err){
                        return next(err);
                    }

                    if (resultModel){
                        return res.status(200).send({success: 'You have already requested this service'});
                    }

                    createObj = {
                        name: name,
                        stylist: ObjectId(uId),
                        serviceId: serviceId
                    };

                    serviceModel = new Services(createObj);

                    serviceModel
                        .save(function(err){

                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'request succeed'});

                        });

                });
        });
    };

};

module.exports = UserHandler;
