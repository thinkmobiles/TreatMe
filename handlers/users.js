
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
var fs = require('fs');
var StripeModule = require('../helpers/stripe');
var ClientHandler = require('./clients');

var UserHandler = function (app, db) {

    var self = this;
    var stripe = new StripeModule();
    var User = db.model('User');
    var Gallery = db.model('Gallery');
    var Appointment = db.model('Appointment');
    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');
    var Subscription = db.model('Subscription');

    var session = new SessionHandler(db);
    var image = new ImageHandler();
    var clientHandler = new ClientHandler(app, db);

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    function getAllUserAppointments(userId, role, appointmentStatus, page, limit, sortParam, order, search, callback){
        var criteria = {};
        var projection;
        var populateArray = [];
        var sortObj = {};
        var APPOINTMENT = CONSTANTS.STATUSES.APPOINTMENT;
        var searchRegExp;
        var searchCriteria = {};

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (!callback && typeof search === 'function'){
            callback = search;
            search = null;
        }

        if (role === CONSTANTS.USER_ROLE.CLIENT){
            criteria['client.id'] = userId;
            projection = {
                __v: 0,
                client: 0,
                clientLoc: 0,
                requestDate: 0,
                status: 0
            };
            populateArray.push({path: 'stylist.id', select: 'personalInfo.avatar salonInfo.salonName'});
        }

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            criteria['stylist.id'] = userId;
            projection = {
                __v: 0,
                stylist: 0,
                clientLoc: 0,
                requestDate: 0,
                status: 0
            };
            populateArray.push({path: 'client.id', select: 'personalInfo.avatar'});
        }

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            if (sortParam && sortParam !== 'date' && sortParam !== 'client' && sortParam !== 'service' && sortParam !== 'stylist' && sortParam !== 'status') {
                return callback(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
            }

            if (sortParam === 'client') {
                sortObj['client.firstName'] = order;
                sortObj['client.lastName'] = order;
            }

            projection = {
                __v: 0,
                clientLoc: 0
            };

            if (appointmentStatus === APPOINTMENT.PENDING){
                if (search){
                    searchRegExp = new RegExp('.*' + search + '.*', 'ig');
                    searchCriteria = {
                        $or: [
                            {'client.firstName': {$regex: searchRegExp}},
                            {'client.lastName': {$regex: searchRegExp}},
                            {'clientFullName': {$regex: searchRegExp}},
                            {'serviceType.name': {$regex: searchRegExp}}
                        ]
                    };
                }

                if (sortParam === 'date' || !sortParam) {
                    sortObj.requestDate = order;
                }

                if (sortParam === 'service') {
                    sortObj['serviceType.name'] = order;
                }

                projection.bookingDate = 0;

                criteria['$and'] = [
                    {status: {$in : [APPOINTMENT.CREATED, APPOINTMENT.SUSPENDED]}},
                    searchCriteria
                ];

            }

            if (appointmentStatus ===  APPOINTMENT.BOOKED){

                if (search) {
                    searchRegExp = new RegExp('.*' + search + '.*', 'ig');

                    searchCriteria = {
                        $or: [
                            {'client.firstName': {$regex: searchRegExp}},
                            {'client.lastName': {$regex: searchRegExp}},
                            {'clientFullName': {$regex: searchRegExp}},
                            {'stylist.firstName': {$regex: searchRegExp}},
                            {'stylist.lastName': {$regex: searchRegExp}},
                            {'stylistFullName': {$regex: searchRegExp}}
                        ]
                    };
                }

                if (sortParam === 'date' || !sortParam) {
                    sortObj.bookingDate = order;
                }

                if (sortParam === 'stylist') {
                    sortObj['stylist.firstName'] = order;
                    sortObj['stylist.lastName'] = order;
                }

                if (sortParam === 'status') {
                    sortObj.status = order;
                }

                projection.requestDate = 0;
                projection.serviceType = 0;

                criteria['$and'] = [
                    {status: {$in : [
                        APPOINTMENT.CONFIRMED,
                        APPOINTMENT.BEGINS,
                        APPOINTMENT.SUCCEEDED,
                        APPOINTMENT.CANCEL_BY_CLIENT,
                        APPOINTMENT.CANCEL_BY_STYLIST
                    ]}},
                    searchCriteria
                ];

            }

        }

        async.parallel([

            function(cb){

                Appointment
                    .count(criteria, function(err, count){
                       if (err){
                           return cb(err);
                       }

                        cb(null, count);
                    });
            },

            function(cb){
                Appointment
                    .find(criteria, projection)
                    .populate(populateArray)
                    .sort(sortObj)
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .exec(function(err, appointmentModelsArray){
                        var avatarName;

                        if (err){
                            return cb(err);
                        }

                        appointmentModelsArray.map(function(appointmentModel){

                            if (role === CONSTANTS.USER_ROLE.CLIENT){
                                avatarName = appointmentModel.get('stylist.id.personalInfo.avatar');

                                if (avatarName){
                                    appointmentModelsArray.stylist.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                                }
                            } else {
                                avatarName = appointmentModel.get('client.id.personalInfo.avatar');

                                if (avatarName){
                                    appointmentModelsArray.client.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                                }
                            }
                        });

                        cb(null, appointmentModelsArray);
                    });
            }],

            function(err, result){
                if (err){
                    return callback(err);
                }

                callback(null, {total: result[0], data: result[1]});
            });
    }

    function getUserAppointmentById(userId, appointmentId, role, callback){
        var populateArray = [{path: 'serviceType.id', select: 'logo'}];
        var projection;
        var criteria = {_id: appointmentId};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return callback(badRequests.InvalidValue({value: appointmentId, param: 'id'}));
        }

        if (role === CONSTANTS.USER_ROLE.CLIENT){
            criteria['client.id'] = userId;
            projection = {
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
            populateArray.push(
                {path: 'stylist.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName personalInfo.profession personalInfo.phone salonInfo.salonName salonInfo.address salonInfo.city salonInfo.state salonInfo.country salonInfo.zipCode'}
            );
        }

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            criteria['stylist.id'] = userId;
            projection = {
                __v: 0,
                stylist: 0,
                requestDate: 0,
                startDate: 0,
                endDate: 0,
                cancellationReason: 0,
                price: 0,
                rateComment: 0
            };
            populateArray.push({path: 'client.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName personalInfo.phone'});
        }

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            projection = {
                __v: 0,
                startDate: 0,
                endDate: 0,
                price: 0,
                oneTimeService: 0

            };
            populateArray.push({path: 'client.id', select: 'email personalInfo.avatar personalInfo.phone'}, {path: 'stylist.id', select: 'personalInfo.avatar personalInfo.phone salonInfo'});
        }

        Appointment
            .findOne(criteria, projection)
            .populate(populateArray)
            .exec(function(err, appointmentModel){
                var clientAvatarName;
                var clientAvatarUrl = '';
                var stylistAvatarName;
                var stylistAvatarUrl = '';
                var logo;
                var serviceLogoUrl = '';
                var stylistAddress;
                var modelJSON;

                if (err){
                    return callback(err);
                }

                if (!appointmentModel){
                    return callback(badRequests.NotFound({target: 'Appointment'}));
                }

                modelJSON = appointmentModel.toJSON();

                if (modelJSON.client && modelJSON.client.id && modelJSON.client.id._id){
                    clientAvatarName = appointmentModel.get('client.id.personalInfo.avatar');

                    if (clientAvatarName){
                        clientAvatarUrl = image.computeUrl(clientAvatarName, CONSTANTS.BUCKET.IMAGES);
                    }

                    modelJSON.client = {
                        _id: modelJSON.client.id._id,
                        name: modelJSON.client.firstName + ' ' + modelJSON.client.lastName,
                        email: modelJSON.client.id.email,
                        avatar: clientAvatarUrl,
                        address: modelJSON.clientLoc.address || 'Unknown client address',
                        phone: modelJSON.client.id.personalInfo.phone

                    };

                    delete modelJSON.clientLoc;
                }

                if (modelJSON.stylist && modelJSON.stylist.id && modelJSON.stylist.id._id){
                    stylistAvatarName = appointmentModel.get('stylist.id.personalInfo.avatar');

                    if (stylistAvatarName){
                        stylistAvatarUrl = image.computeUrl(stylistAvatarName, CONSTANTS.BUCKET.IMAGES);
                    }

                    stylistAddress = modelJSON.stylist.id.salonInfo.address + ', ' + modelJSON.stylist.id.salonInfo.city + ', ' + modelJSON.stylist.id.salonInfo.state + ', ' + modelJSON.stylist.id.salonInfo.country + ', ' + modelJSON.stylist.id.salonInfo.zipCode;

                    modelJSON.stylist = {
                        _id: modelJSON.stylist.id._id,
                        name: modelJSON.stylist.firstName + ' ' + modelJSON.stylist.lastName,
                        avatar: stylistAvatarUrl,
                        address: stylistAddress,
                        phone: modelJSON.stylist.id.personalInfo.phone,
                        salonName: modelJSON.stylist.id.salonInfo.salonName,
                        profession: modelJSON.stylist.id.personalInfo.profession
                    };
                }

                if (modelJSON.serviceType && modelJSON.serviceType.id && modelJSON.serviceType.id._id){
                    logo = appointmentModel.get('serviceType.id.logo');

                    if (logo){
                        serviceLogoUrl = image.computeUrl(logo, CONSTANTS.BUCKET.IMAGES);
                    }

                    modelJSON.serviceType = {
                        _id: modelJSON.serviceType.id._id,
                        name: modelJSON.serviceType.name,
                        logo: serviceLogoUrl
                    };
                }

                callback(null, modelJSON);
            });
    }

    function checkHeader (header){
        var headerRegExp = new RegExp('.*iPhone;.*', 'ig');

        return headerRegExp.test(header);

    }

    this.addStylistProfile = function(createObj, callback){

        var email = createObj.email;

        User
            .findOne({email: email, role: CONSTANTS.USER_ROLE.STYLIST}, {_id: 1}, function(err, resultModel){
                var locationAddress;
                var userModel;

                if (err){
                    return callback(err);
                }

                if (resultModel){
                    return callback(badRequests.EmailInUse());
                }

                locationAddress = createObj.salonInfo.address + ' ' + createObj.salonInfo.city + ' ' + createObj.salonInfo.country;

                clientHandler.getCoordinatesByLocation(locationAddress, function(err, coordinates){
                    if (err){
                        return callback(err);
                    }

                    createObj.loc = {
                        coordinates : coordinates
                    };

                    userModel = new User(createObj);

                    userModel
                        .save(function(err){
                            if (err){
                                return callback(err);
                            }

                            callback(null, userModel._id);
                        });
                });
            });
    };

    this.createAdmin = function (req, res, next) {

        var body = req.body;
        var email = body.email;
        var password = body.password;

        if (!email || !password) {
            return next(badRequests.NotEnParams({reqParams: 'Email or password'}));
        }

        password = getEncryptedPass(password);

        User.findOne({
            email: body.email,
            password: password,
            role: CONSTANTS.USER_ROLE.ADMIN,
            approved: true
        }, function (err, result) {
            var user;

            if (err) {
                return next(err);
            }

            if (result) {
                return next(badRequests.EmailInUse());
            }

            user = new User({email: body.email, password: password, role: CONSTANTS.USER_ROLE.ADMIN, approved: true});

            user
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }

                    session.register(req, res, user._id, true, CONSTANTS.USER_ROLE.ADMIN);

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

        if (!body.role) {
            return next(badRequests.NotEnParams({reqParams: 'role'}));
        }

        if (body.fbId) {

            User
                .findOne({fbId: body.fbId, role: body.role}, function (err, resultModel) {

                    if (err) {
                        return next(err);
                    }

                    if (resultModel) {
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
                    firstName: validator.trim(body.firstName),
                    lastName: validator.trim(body.lastName),
                    phone: body.phone
                },
                email: email,
                password: getEncryptedPass(password),
                token: token,
                role: body.role
            };

            User
                .findOne({email: email, role: body.role}, function (err, resultModel) {

                    if (err) {
                        return next(err);
                    }

                    if (resultModel) {
                        return next(badRequests.EmailInUse());
                    }

                    async
                        .waterfall([
                            function(cb){
                                if (body.role === CONSTANTS.USER_ROLE.STYLIST){
                                    stripe
                                        .createRecipient({
                                            email: email,
                                            name: createObj.personalInfo.firstName + ' ' + createObj.personalInfo.lastName,
                                            type: 'individual'
                                        }, function(err, recipient){

                                            if (err){
                                                return cb(err);
                                            }

                                            cb(null, recipient.id);

                                        });
                                } else if (body.role === CONSTANTS.USER_ROLE.CLIENT){
                                    stripe
                                        .createCustomer({
                                            email: email
                                        }, function(err, customer){

                                            if (err){
                                                return cb(err);
                                            }

                                            cb(null, customer.id);

                                        });
                                }

                            },

                            function(paymentsId, cb){

                                if(body.role === CONSTANTS.USER_ROLE.STYLIST){
                                    createObj['payments'] = {
                                        recipientId: paymentsId
                                    };
                                } else {
                                    createObj['payments'] = {
                                        customerId: paymentsId
                                    };
                                }

                                user = new User(createObj);

                                user.save(function(err){
                                    if (err){
                                        return cb(err);
                                    }

                                    cb(null);
                                });
                            },

                            function(cb){
                                mailer.confirmRegistration({
                                    name: createObj.firstName + ' ' + createObj.lastName,
                                    email: email,
                                    password: password,
                                    token: token
                                });

                                cb(null);
                            }
                        ], function(err){

                            if (err){
                                return next(err);
                            }

                            res.status(201).send({success: body.role + ' created successful. For using your account you must verify it. Please check email.'});
                        });

                });
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

        var url;

        var token = req.params.token;
        var uId;
        var header = req.headers['user-agent'];

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
                    return res.status(200).send({success: "You are already confirmed your account"}); // TODO send pretty html page instead of JSON
                }

                uId = userModel.get('_id');


                if (checkHeader(header)){
                    url = 'treatme://';
                } else {
                    url = process.env.EXT_HOST;  // TODO change
                }

                res.render('registrationTemplate', {
                    url: url
                });

            });
    };

    this.forgotPassword = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/forgot/`__
         *
         * This __method__ allows recover password by _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/forgot/
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Check your email"
         *  }
         *
         * @param {string} email - `User` email
         *
         * @method forgotPassword
         * @instance
         */

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

        var query = req.query;
        var forgotToken = query.token;
        var userRole = query.role;
        var header = req.headers['user-agent'];
        var url;

        User
            .findOneAndUpdate({forgotToken: forgotToken, role: userRole}, {$set: {forgotToken: ''}}, function (err, userModel) {
                if (err) {
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.TokenWasUsed());
                }

                if (checkHeader(header)){
                    url = 'treatme://login/changePass'
                } else {
                    url = process.env.EXT_HOST;
                }

                res.render('confirmPassword', {
                    url: url
                });

            });
    };

    this.changePassword = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/passwordChange/`__
         *
         * This __method__ allows change password by _User_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/passwordChange/
         *
         * @example Body example:
         *
         * {
         *      "password": "qwerty",
         *      "token": "1231gs1f3s21sf54s654s",
         *      "role": "Stylist"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Password changed successfully"
         *  }
         *
         * @param {string} password - `User` password
         * @param {string} token - `User` forgot token
         * @param {string} role - `User` role
         *
         * @method changePassword
         * @instance
         */

        var forgotToken;
        var userRole;
        var body = req.body;
        var encryptedPassword;

        if (!body.password || !body.token || !body.role) {
            return next(badRequests.NotEnParams({params: 'password or token or role'}));
        }

        forgotToken = body.token;
        userRole = body.role;

        encryptedPassword = getEncryptedPass(body.password);

        User
            .findOneAndUpdate({forgotToken: forgotToken, role: userRole}, {$set: {
                password: encryptedPassword,
                forgotToken: ''
            }}, function (err, userModel) {

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
         *      "fbId": "test1"
         * }
         *
         * If you want login via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty"
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
         *
         * @method signIn
         * @instance
         */

        var body = req.body;

        var fbId;
        var email;
        var password;
        var role;
        var findObj;


        if (body.fbId) {

            fbId = body.fbId;

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

            if (!body.email || !body.password) {
                return next(badRequests.NotEnParams({reqParams: 'email and password or fbId'}));
            }

            email = body.email;
            password = getEncryptedPass(body.password);

            if (body.role && body.role === CONSTANTS.USER_ROLE.ADMIN){
                findObj = {email: email, password: password, role: body.role};
            } else {
                findObj = {email: email, password: password}
            }

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            User
                .findOneAndUpdate(findObj, {$set: {forgotToken: ''}}, function (err, userModel) {
                    var token;

                    if (err) {
                        return next(err);
                    }

                    if (!userModel) {
                        if (!body.role){
                            return next(badRequests.SignInError());
                        }

                        return next(badRequests.AccessError());
                    }

                    token = userModel.get('token');
                    role = userModel.get('role');

                    if (token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    session.register(req, res, userModel._id, false, role);
                });
        }
    };

    function getUpdateData(userObj, body){
        var salonInfo;
        var personalInfo = userObj.personalInfo;

        if (body.personalInfo){
            if (body.personalInfo.firstName) {
                personalInfo.firstName = validator.trim(body.personalInfo.firstName);
            }

            if (body.personalInfo.lastName) {
                personalInfo.lastName = validator.trim(body.personalInfo.lastName);
            }

            if (body.personalInfo.profession && (userObj.role === CONSTANTS.USER_ROLE.STYLIST)) {
                personalInfo.profession = validator.trim(body.personalInfo.profession);
            }

            if (body.personalInfo.phone) {
                personalInfo.phone = validator.trim(body.personalInfo.phone);
            }

            if (body.personalInfo.facebookURL && (userObj.role === CONSTANTS.USER_ROLE.STYLIST)) {
                personalInfo.facebookURL = body.personalInfo.facebookURL;
            }
        }

        if (userObj.role === CONSTANTS.USER_ROLE.STYLIST) {

            salonInfo = userObj.salonInfo;

            if (body.salonInfo){
                if (body.salonInfo.salonName){
                    salonInfo.salonName = validator.trim(body.salonInfo.salonName);
                }

                if (body.salonInfo.yourBusinessRole){
                    salonInfo.yourBusinessRole = validator.trim(body.salonInfo.yourBusinessRole);
                }

                if (body.salonInfo.phone){
                    salonInfo.phone = validator.trim(body.salonInfo.phone);
                }

                if (body.salonInfo.email){
                    salonInfo.email = validator.trim(body.salonInfo.email);
                }

                if (body.salonInfo.address){
                    salonInfo.address = validator.trim(body.salonInfo.address);
                }

                if (body.salonInfo.state){
                    salonInfo.state = validator.trim(body.salonInfo.state);
                }

                if (body.salonInfo.zipCode){
                    salonInfo.zipCode = validator.trim(body.salonInfo.zipCode);
                }

                if (body.salonInfo.phone){
                    salonInfo.phone = validator.trim(body.salonInfo.phone);
                }

                if (body.salonInfo.licenseNumber){
                    salonInfo.licenseNumber = validator.trim(body.salonInfo.licenseNumber);
                }

                if (body.salonInfo.city){
                    salonInfo.city = validator.trim(body.salonInfo.city);
                }

                if (body.salonInfo.country){
                    salonInfo.country = validator.trim(body.salonInfo.country);
                }
            }

        }

        return {
            personalInfo: personalInfo,
            salonInfo: salonInfo
        }
    }

    this.updateUserProfile = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/profile/`__
         *
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/proflie
         *
         * @example Body example:
         *
         *  {
         *    personalInfo:{
         *            "firstName": "Petya",
         *            "lastName": "Petrovich",
         *            "profession": "cleaner"
         *            "phone":"987654321",
         *            "email":"zehetawop@ubismail.net",
         *            "facebookURL": "www.facebook.com"
         *        },
         *    salonInfo: {
         *           salonName: "My salon",
         *            phone: "01",
         *            email: "vasya@pupkin.com",
         *            businessRole: "employee",
         *            address: "Some address string",
         *            state: "Some state"
         *            zipCode: "88001"
         *            city: "Uzhgorod"
         *            country: "Ukraine"
         *            licenseNumber: "41515643"
         *    },
         *    "services": [
         *       {
         *           "id": "5638ccde3624f77b33b6587d",
         *           "price": 27
         *       },
         *       {
         *           "id": "56408f8281c43c3a24a332fa",
         *           "price": 24
         *       }
         *   ]
         *
         *  }
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "User updated successfully"
         *  }
         *
         * @method updateUserProfile
         * @instance
         */

        var role = req.session.role;
        var uId = req.session.uId;
        var body = req.body;
        var userObj;
        var update;

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            if (!req.params.userId){
                return next(badRequests.NotEnParams({reqParams: 'userId'}));
            }

            uId = req.params.userId;

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(uId)){
                return next(badRequests.InvalidValue({value: uId, param: 'userId'}));
            }
        }

        User
            .findOne({_id: uId}, {personalInfo: 1, salonInfo: 1, role: 1}, function (err, resultModel) {

                if (err) {
                    return next(err);
                }

                if (!resultModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                userObj = resultModel.toJSON();

                update = getUpdateData(userObj, body);

                async
                    .parallel([
                        function(cb){
                            var locationAddress;
                            var updateObj = {
                                $set: {
                                    personalInfo: update.personalInfo,
                                    salonInfo: update.salonInfo
                                }
                            };

                            if (body.salonInfo && (body.salonInfo.address || body.salonInfo.city || body.salonInfo.state || body.salonInfo.country || body.salonInfo.zipCode)){
                                locationAddress = update.salonInfo.address + ' ' + update.salonInfo.city + ' ' + update.salonInfo.country;

                                clientHandler.getCoordinatesByLocation(locationAddress, function(err, coordinates){
                                    if (err){
                                        return cb(err);
                                    }

                                    updateObj.$set['loc.coordinates'] = coordinates;

                                    resultModel.update(updateObj, cb);
                                });
                            } else {
                                resultModel.update(updateObj, cb);
                            }
                        },

                        function(cb){
                            var services = body.services;

                            if (userObj.role !== CONSTANTS.USER_ROLE.STYLIST || !body.services){
                                return cb(null);
                            }


                            services = services.map(function(service){
                                service.stylist = ObjectId(uId);
                                service.approved = true;

                                if (!CONSTANTS.REG_EXP.OBJECT_ID.test(service.id)){
                                    return cb(badRequests.InvalidValue({value: service.id, param: 'service.id'}));
                                }

                                service.serviceId = ObjectId(service.id);
                                delete service.id;
                                return service;
                            });

                            Services
                                .remove({stylist: uId}, function(err){

                                    if (err){
                                        return cb(err);
                                    }

                                    Services.create(services, cb);

                                });

                        },

                        function(cb){
                            var update = {};
                            var criteria = {};

                            if (!body.personalInfo){
                                return cb(null);
                            }

                            if (!body.personalInfo.firstName &&  !body.personalInfo.lastName){
                                return cb(null);
                            }


                            if (userObj.role === CONSTANTS.USER_ROLE.STYLIST){
                                criteria.stylist = {
                                    id: ObjectId(uId)
                                };

                                if (body.personalInfo.firstName){
                                    update['stylist.firstName'] = body.personalInfo.firstName;
                                }

                                if (body.personalInfo.lastName){
                                    update['stylist.lastName'] = body.personalInfo.lastName;
                                }

                            } else {
                                criteria.client = {
                                    id: ObjectId(uId)
                                };

                                if (body.personalInfo.firstName){
                                    update['client.firstName'] = body.personalInfo.firstName;
                                }

                                if (body.personalInfo.lastName){
                                    update['client.lastName'] = body.personalInfo.lastName;
                                }
                            }

                            Appointment
                                .update(criteria, {$set: update}, {multi: true}, cb)
                        },

                        function(cb){

                            // TODO update subscription when update client profile
                            if (userObj !== CONSTANTS.USER_ROLE.CLIENT){
                                return cb(null);
                            }

                            if (body.personalInfo && body.personalInfo.firstName){
                                update['client.firstName'] = body.personalInfo.firstName;
                            }

                            if (body.personalInfo && body.personalInfo.lastName){
                                update['client.lastName'] = body.personalInfo.lastName;
                            }

                            Subscription
                                .update({'client.id': uId}, {$set: update}, {multi: true}, cb);
                        }

                    ], function(err){

                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: userObj.role + ' updated successfully'});

                    });

            });
    };

    this.getProfile = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/profile/`__
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/proflie/
         *
         * @example Body example:
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *       "_id": "563c53d1bd76bceb104a8900",
         *       "role": "Stylist",
         *       "createdAt": "2015-11-06T07:16:33.766Z",
         *       "activeSubscriptions": [],
         *       "payments": {
         *          "recipientId": kjghkjhh;l123154746,
         *          "customerId": null
         *       },
         *       "salonInfo": {
         *          "availability": {
         *                          "0": [
         *                                    {
         *                                        "_id": "5644b765cfd3b4580b1f3faf",
         *                                        "to": "18:00",
         *                                        "from": "09:00"
         *                                    }
         *                                ],
         *                                ...
         *                          "6": [
         *                                    {
         *                                        "_id": "5644b765cfd3b4580b1f3fa9",
         *                                        "to": "19:30",
         *                                        "from": "09:00"
         *                                    }
         *                               ]
         *           },
         *           "licenseNumber": "",
         *           "country": "USA",
         *           "city": "New York",
         *           "zipCode": "11000",
         *           "state": "Some state",
         *           "address": "Brooklyn 65",
         *           "businessRole": "Employee",
         *           "email": "",
         *           "phone": "",
         *           "salonName": "Hair salon"
         *       },
         *       "personalInfo": {
         *           "avatar": "",
         *           "facebookURL": "",
         *           "phone": "01",
         *           "profession": "",
         *           "lastName": "Vashkeba",
         *           "firstName": "Misha"
         *       },
         *       "suspend": {
         *           "history": [],
         *           "isSuspend": false
         *       },
         *       "email": "vashm@mail.ua",
         *       "coordinates": [22, 48]
         *   }
         *
         * @method getProfile
         * @instance
         */

        var userId = req.params.userId || req.session.uId;
        var projectionObj;

        if (req.params.userId && !CONSTANTS.REG_EXP.OBJECT_ID.test(userId)) {
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
                var avatarName;

                if (err) {
                    return next(err);
                }
                if (!clientModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                avatarName = clientModel.get('personalInfo.avatar');

                if (avatarName){
                    clientModel.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                }

                res.status(200).send(clientModel);
            });
    };

    this.uploadAvatar = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/avatar/`__
         *
         * This __method__ allows upload _User_ avatar
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/avatar/
         *
         * @example Body example:
         *
         * {
         *      "avatar": "data:image/png;base64, /9j/4AAQSkZJRgABAQAAAQABAAD/2wCE..."
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Avatar upload successful"
         *  }
         *
         * @param {string} avatar - avatar string(Base64)
         *
         * @method uploadAvatar
         * @instance
         */

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
                                .update({$set: {'personalInfo.avatar': imageName}}, cb);
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

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/avatar/`__
         *
         * This __method__ allows delete _User_ avatar
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/avatar/
         *
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Avatar removed successfully"
         *  }
         *
         * @method removeAvatar
         * @instance
         */

        var userId = req.session.uId;

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            if (!req.params.id){
                return next(badRequests.NotEnParams({reqParams: 'id'}));
            }

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
                    .update({$set: {'personalInfo.avatar': ''}}, function(err){
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

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/coordinates/`__
         *
         * This __method__ allows update _User_ location
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/avatar/
         *
         * @example Body example:
         *
         * {
         *      "coordinates": [150, -89]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Coordinates updated successfully"
         *  }
         *
         * @param {array} coordinates - _User_ location coordinates -180 < coordinates[0] < 180 ; -90 < coordinates[1] < 90
         *
         * @method updateLocation
         * @instance
         */

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
            .findOneAndUpdate({_id: userId}, {$set: updateObj}, function (err, userModel) {
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

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/gallery/:clientId?`_
         * _
         * clientId parameter needed for Stylist only
         *
         * This __method__ allows get _User_ gallery photos
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/gallery/56405477f2d8c978068b12b3
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "total": 1,
         *     "data": [
         *         {
         *             "_id": "564f0abd122888ec1ee6f87d",
         *             "client": "Petya Lyashenko",
         *             "serviceType": "Manicure",
         *             "bookingDate": "2015-11-08T10:17:50.060Z",
         *             "photoUrl": "http://projects.thinkmobiles.com:8871/uploads/development/images/564f0abd122888ec1ee6f87d.png"
         *         }
         *     ]
         * }
         *
         * @method getGalleryPhotos
         * @instance
         */

        var session = req.session;
        var userId = req.params.id;
        var query = req.query;
        var status;
        var page = (query.page >=1) ? query.page : 1;
        var limit = (query.limit >=1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_PHOTOS;
        var findObj = {};
        var populateArray = [
            {path: 'serviceType', select: 'name'}
        ];

        if (session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = session.uId;
            populateArray.push({path: 'stylist', select: 'salonInfo.salonName personalInfo.firstName personalInfo.lastName personalInfo.avatar'});
        }

        if (session.role === CONSTANTS.USER_ROLE.STYLIST){
            if (!userId){
                return next(badRequests.NotEnParams({reqParams: 'id'}));
            }

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
                return next(badRequests.InvalidValue({value: userId, param: 'id'}));
            }

            findObj.client = userId;
            findObj.stylist = session.uId;
            populateArray.push({path: 'client', select: 'personalInfo.firstName personalInfo.lastName'});
        }

        if (session.role === CONSTANTS.USER_ROLE.ADMIN){
            status = query.status ? query.status.toLowerCase() : null;

            if (status && status !== 'pending' && status !== 'approved' && status !== 'deleting'){
                return next(badRequests.InvalidValue({value: status, param: 'status'}))
            }

            if (status === 'approved' || !status){
                findObj.status = CONSTANTS.STATUSES.GALLERY.APPROVED;
            }

            if (status === 'pending'){
                findObj.status = CONSTANTS.STATUSES.GALLERY.PENDING;
            }

            if (status === 'deleting'){
                findObj.status = CONSTANTS.STATUSES.GALLERY.DELETING;
            }

            populateArray.push(
                {path: 'client', select: 'personalInfo.firstName personalInfo.lastName'},
                {path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'}
            );
        }

        async.parallel({

            galleryCount: function(cb){
                Gallery.count(findObj, function(err, count){
                    if (err){
                        return cb(err);
                    }

                    cb(null, count);
                });
            },

            gallery: function(cb){
                Gallery
                    .find(findObj, {__v: 0})
                    .populate(populateArray)
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .exec(function(err, galleryModelsArray){
                        var resultPhotos;

                        if (err){
                            return cb(err);
                        }

                        resultPhotos = galleryModelsArray.map(function(model){
                            var modelJSON = model.toJSON();

                            modelJSON.photoUrl = image.computeUrl(model._id, CONSTANTS.BUCKET.IMAGES);

                            if (modelJSON.serviceType){
                                modelJSON.serviceType = modelJSON.serviceType.name;
                            } else {
                                modelJSON.serviceType = 'Service was removed';
                            }

                            if (session.role === CONSTANTS.USER_ROLE.CLIENT){
                                delete modelJSON.client;

                                if (modelJSON.stylist.personalInfo.avatar){
                                    modelJSON.avatar = image.computeUrl(modelJSON.stylist.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                                } else {
                                    modelJSON.avatar = '';
                                }
                            }

                            if (session.role === CONSTANTS.USER_ROLE.STYLIST){
                                delete modelJSON.stylist;
                            }

                            if (modelJSON.stylist){
                                if (modelJSON.stylist.salonInfo){
                                    modelJSON.salon = modelJSON.stylist.salonInfo.salonName;
                                }

                                modelJSON.stylist = modelJSON.stylist.personalInfo.firstName + ' ' + modelJSON.stylist.personalInfo.lastName;
                            }

                            if (modelJSON.client){
                                modelJSON.client = modelJSON.client.personalInfo.firstName + ' ' + modelJSON.client.personalInfo.lastName;
                            }

                            return modelJSON;
                        });

                        cb(null, resultPhotos);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.galleryCount, data: result.gallery});
        });
    };

    this.removePhotoFromGallery = function(req, res, next){

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/gallery/:id`__
         *
         * This __method__ allows delete _User_ photo from gallery
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/gallery/564f0abd122888ec1ee6f87d
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Photo was removed from gallery"
         *  }
         *
         * @method removePhotoFromGallery
         * @instance
         */

        var session = req.session;
        var userId = session.uId;
        var imageName = req.params.id;
        var findObj = {_id: imageName};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(imageName)){
            return next(badRequests.InvalidValue({value: imageName, param: 'id'}));
        }

        if (session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = ObjectId(userId);
        }

        if (session.role === CONSTANTS.USER_ROLE.STYLIST){
            findObj.stylist = ObjectId(userId);
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
                imageModel.remove(function(err){
                    if (err){
                        return cb(err);
                    }

                    cb();
                });
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
        var session = req.session;
        var query = req.query;
        var appointmentId = req.params.id;
        var sortParam = query.sort;
        var order = (query.order === '1') ? 1 : -1;
        var page = (query.page >= 1) ? query.page : 1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_APPOINTMENTS;
        var appointmentStatus;
        var userId = session.uId;
        var search = query.search;

        if (appointmentId){
            getUserAppointmentById(userId, appointmentId, session.role, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
        } else {
            if (session.role === CONSTANTS.USER_ROLE.ADMIN){
                appointmentStatus = query.status;

                if (!appointmentStatus){
                    return next(badRequests.NotEnParams({reqParams: 'status'}));
                }
            }

            getAllUserAppointments(userId, session.role, appointmentStatus, page, limit, sortParam, order, search, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
        }
    };

    this.cancelByUser = function(req, res, next){
        var body = req.body;
        var session = req.session;
        var userId = session.uId;
        var appointmentId = body.appointmentId;
        var cancellationReason = body.cancellationReason;
        var findObj = {_id: appointmentId};
        var updateObj;

        if (!appointmentId || !cancellationReason){
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and cancellationReason'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        if (session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = userId;
            updateObj = {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_CLIENT, cancellationReason: cancellationReason}};
        }

        if (session.role === CONSTANTS.USER_ROLE.STYLIST){
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

    this.getService = function(stylistId, callback){

        var ind;
        var allId;
        var stylistServiceId = [];
        var serviceArray = [];
        var serviceObj;

        ServiceType.find({}, function(err, allServiceModels){

            if (err){
                return callback(err);
            }

            Services
                .find({stylist: stylistId})
                .populate({path: 'serviceId', select: '_id name logo'})
                .exec(function(err, stylistServiceModel){

                    if (err){
                        return callback(err);
                    }

                    allId = (_.pluck(allServiceModels, '_id')).toStringObjectIds();

                    for (var i = stylistServiceModel.length; i--;){
                        if (!stylistServiceModel[i].serviceId){
                            return callback(badRequests.DatabaseError());
                        }

                        stylistServiceId[i] = stylistServiceModel[i].serviceId._id.toString();
                    }

                    for (i = 0, n = allServiceModels.length; i < n; i++){
                        ind = stylistServiceId.indexOf(allId[i]);

                        if (ind !== -1){
                            serviceObj = {
                                id: stylistServiceModel[ind].serviceId._id,
                                name: stylistServiceModel[ind].serviceId.name,
                                logo: image.computeUrl(stylistServiceModel[ind].serviceId.logo, CONSTANTS.BUCKET.IMAGES),
                                status: stylistServiceModel[ind].approved ? 'approved' : 'pending',
                                price: stylistServiceModel[ind].price || 0
                            };

                            serviceArray.push(serviceObj);
                        } else {
                            serviceObj = {
                                id: allServiceModels[i]._id,
                                name: allServiceModels[i].name,
                                logo: image.computeUrl(allServiceModels[i].logo, CONSTANTS.BUCKET.IMAGES),
                                status: 'new',
                                price: 0
                            };

                            serviceArray.push(serviceObj);
                        }

                    }

                    callback(null, serviceArray);

                });

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


        self.getService(uId, function(err, resultServices){

            if (err){
                return next(err);
            }

            res.status(200).send(resultServices);
        });
    };
};

module.exports = UserHandler;
