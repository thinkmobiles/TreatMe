
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
var geocoder = require('geocoder');
var StripeModule = require('../helpers/stripe');

var UserHandler = function (app, db) {

    var self = this;
    var stripe = new StripeModule();
    var User = db.model('User');
    var Gallery = db.model('Gallery');
    var Appointment = db.model('Appointment');
    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');

    var session = new SessionHandler(db);
    var image = new ImageHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    /*function getAppDetailsForSearch (search, status, callback){
        var APPOINTMENT = CONSTANTS.STATUSES.APPOINTMENT;
        var searchRegExp = new RegExp('.*' + search + '.*', 'ig');
        var userCriteria = {};
        var serviceCriteria = {};

        if (status === APPOINTMENT.PENDING){
            userCriteria['$and'] = [
                {role: CONSTANTS.USER_ROLE.CLIENT},
                {
                    $or: [
                        {'personalInfo.firstName': {$regex: searchRegExp}},
                        {'personalInfo.lastName': {$regex: searchRegExp}}
                    ]
                }
            ];

            serviceCriteria.name = {$regex: searchRegExp};
        } else if (status === APPOINTMENT.BOOKED) {
            userCriteria['$and'] = [
                {
                    $or: [
                        {role: CONSTANTS.USER_ROLE.CLIENT},
                        {role: CONSTANTS.USER_ROLE.STYLIST}
                    ]
                },
                {
                    $or: [
                        {'personalInfo.firstName': {$regex: searchRegExp}},
                        {'personalInfo.lastName': {$regex: searchRegExp}}
                    ]
                }
            ];
        }

        async
            .parallel([
                function(cb){
                    var usersId;
                    User
                        .find(userCriteria, {_id: 1})
                        .exec(function(err, usersCollection){
                            if (err){
                                return cb(err);
                            }

                            usersId = _.pluck(usersCollection, '_id');

                            cb(null, usersId);
                        });
                },

                function(cb){
                    var servicesId;

                    if (status === APPOINTMENT.BOOKED){
                        return cb(null, []);
                    }

                    ServiceType
                        .find(serviceCriteria, {_id: 1})
                        .exec(function(err, serviceCollection){
                            if (err){
                                return cb(err);
                            }

                            servicesId = _.pluck(serviceCollection, '_id');

                            cb(null, servicesId);
                        });
                }
            ], function(err, results){
                if (err){
                    return callback(err);
                }

                callback(null, {
                    usersId: results[0],
                    serviceId: results[1]
                });
            });

    }*/

    function getAllUserAppointments(userId, role, appointmentStatus, page, limit, sortParam, order, search, callback){
        var findObj = {};
        var projectionObj;
        var populateArray = [];
        var sortObj = {};
        var APPOINTMENT = CONSTANTS.STATUSES.APPOINTMENT;
        var searchRegExp;
        var searchCriteria = {};

        if (!callback && typeof search === 'function'){
            callback = search;
            search = null;
        }

        if (role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = userId;
            projectionObj = {
                __v: 0,
                client: 0,
                clientLoc: 0,
                requestDate: 0,
                status: 0
            };
            populateArray.push({path: 'serviceType.id', select: 'name'}, {path: 'stylist.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName salonInfo.salonName'});
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
            populateArray.push({path: 'serviceType.id', select: 'name'}, {path: 'client.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName'});
        }

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            if (sortParam && sortParam !== 'Date' && sortParam !== 'Name' && sortParam !== 'Service' && sortParam !== 'Stylist') {
                return callback(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
            }

            if (sortParam === 'Client' || !sortParam) {
                sortObj['client.firstName'] = order;
                sortObj['client.lastName'] = order;
            }

            projectionObj = {
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
                            {'serviceType.name': {$regex: searchRegExp}}
                        ]
                    };
                }


                if (sortParam === 'Date') {
                    sortObj.requestDate = order;
                }

                if (sortParam === 'Service') {
                    sortObj['serviceType.name'] = order;
                }

                projectionObj.bookingDate = 0;

                findObj['$and'] = [
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
                            {'stylist.firstName': {$regex: searchRegExp}},
                            {'stylist.lastName': {$regex: searchRegExp}}
                        ]
                    };
                }

                if (sortParam === 'Date') {
                    sortObj.bookingDate = order;
                }

                if (sortParam === 'Stylist') {
                    sortObj['stylist.firstName'] = order;
                    sortObj['stylist.lastName'] = order;
                }

                projectionObj.requestDate = 0;
                projectionObj.serviceType = 0;

                findObj['$and'] = [
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
                    .count(findObj, function(err, count){
                       if (err){
                           return cb(err);
                       }

                        cb(null, count);
                    });
            },

            function(cb){
                Appointment
                    .find(findObj, projectionObj)
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
        var populateArray = [];
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
            populateArray.push({path: 'stylist.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName salonInfo.salonName'});
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
            populateArray.push({path: 'client.id', select: 'personalInfo.avatar personalInfo.firstName personalInfo.lastName'});
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
            populateArray.push({path: 'client.id', select: 'personalInfo.firstName personalInfo.lastName personalInfo.avatar personalInfo.phone'});
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

    function checkHeader (header){
        var headerRegExp = new RegExp('.*iPhone;.*', 'ig');

        return headerRegExp.test(header);

    }

    this.addStylistProfile = function(createObj, callback){

        var email = createObj.email;

        User
            .findOne({email: email, role: CONSTANTS.USER_ROLE.STYLIST}, {_id: 1}, function(err, resultModel){
                var addressString;
                var userModel;

                if (err){
                    return callback(err);
                }

                if (resultModel){
                    return callback(badRequests.EmailInUse());
                }

                addressString = createObj.salonInfo.address + ' ' + createObj.salonInfo.city + ' ' + createObj.salonInfo.country;

                geocoder.geocode(addressString, function(err, data){

                    if (err){
                        return callback(err);
                    }

                    if (!data || !data.results.length || !data.results[0].geometry || !data.results[0].geometry.location || data.status !== 'OK'){
                        return callback(badRequests.UnknownGeoLocation());
                    }
                    createObj.loc = {
                        coordinates : [data.results[0].geometry.location.lng, data.results[0].geometry.location.lat]
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
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone
                },
                email: email,
                password: getEncryptedPass(password),
                token: token,
                role: body.role
            };

            User
                .findOne({email: createObj.email, role: body.role}, function (err, resultModel) {

                    if (err) {
                        return next(err);
                    }

                    if (resultModel) {
                        return next(badRequests.EmailInUse());
                    }

                    async
                        .waterfall([
                            function(cb){
                                if (body.role !== CONSTANTS.USER_ROLE.CLIENT){
                                    return cb(null, null);
                                }

                                stripe
                                    .createCustomer({
                                        email: body.email
                                    }, function(err, customer){

                                        if (err){
                                            return cb(err);
                                        }

                                        cb(null, customer.id);

                                    });
                            },

                            function(customerId, cb){
                                createObj['payments'] = {
                                    customerId: customerId
                                };

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
                                    name: body.firstName + ' ' + body.lastName,
                                    email: body.email,
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
                .findOneAndUpdate(findObj, {$set: {forgotToken: ''}}, function (err, userModel) {
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

                    session.register(req, res, userModel._id, false, role);
                });
        }
    };

    function getUpdateData(userObj, body){
        var salonInfo;
        var personalInfo = userObj.personalInfo;

        if (body.personalInfo){
            if (body.personalInfo.firstName) {
                personalInfo.firstName = body.personalInfo.firstName;
            }

            if (body.personalInfo.lastName) {
                personalInfo.lastName = body.personalInfo.lastName;
            }

            if (body.personalInfo.profession && (userObj.role === CONSTANTS.USER_ROLE.STYLIST)) {
                personalInfo.profession = body.personalInfo.profession;
            }

            if (body.personalInfo.phone) {
                personalInfo.phone = body.personalInfo.phone;
            }

            if (body.personalInfo.facebookURL && (userObj.role === CONSTANTS.USER_ROLE.STYLIST)) {
                personalInfo.facebookURL = body.personalInfo.facebookURL;
            }
        }

        if (userObj.role === CONSTANTS.USER_ROLE.STYLIST) {

            salonInfo = userObj.salonInfo;

            if (body.salonInfo){
                if (body.salonInfo.salonName){
                    salonInfo.salonName = body.salonInfo.salonName;
                }

                if (body.salonInfo.yourBusinessRole){
                    salonInfo.yourBusinessRole = body.salonInfo.yourBusinessRole;
                }

                if (body.salonInfo.phone){
                    salonInfo.phone = body.salonInfo.phone;
                }

                if (body.salonInfo.email){
                    salonInfo.email = body.salonInfo.email;
                }

                if (body.salonInfo.address){
                    salonInfo.address = body.salonInfo.address;
                }

                if (body.salonInfo.state){
                    salonInfo.state = body.salonInfo.state;
                }

                if (body.salonInfo.zipCode){
                    salonInfo.zipCode = body.salonInfo.zipCode;
                }

                if (body.salonInfo.phone){
                    salonInfo.phone = body.salonInfo.phone;
                }

                if (body.salonInfo.licenseNumber){
                    salonInfo.licenseNumber = body.salonInfo.licenseNumber;
                }

                if (body.salonInfo.city){
                    salonInfo.city = body.salonInfo.city;
                }

                if (body.salonInfo.country){
                    salonInfo.country = body.salonInfo.country;
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
         * __URL: `/profile/:userId?`__
         *
         * Param userId must be when admin use method
         *
         * This __method__ allows update _User_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/proflie/563c53d1bd76bceb104a8900
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
        var uId;
        var body = req.body;
        var personalInfo;
        var salonInfo = {};
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


        } else {
            uId = req.session.uId;
        }

        User
            .findOne({_id: uId}, {personalInfo: 1, salonInfo: 1, role: 1}, function (err, resultModel) {

                if (err) {
                    return next(err);
                }

                if (!resultModel) {
                    return next(badRequests.DatabaseError());
                }

                userObj = resultModel.toJSON();

                update = getUpdateData(userObj, body);

                async
                    .parallel([
                        function(cb){
                            resultModel.update({$set: {personalInfo: personalInfo, salonInfo: salonInfo}}, cb);
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
                                    return next(badRequests.InvalidValue({value: service.id, param: 'service.id'}));
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
         *       "salonInfo": {
         *           "licenseNumber": "",
         *           "country": "",
         *           "city": "",
         *           "zipCode": "",
         *           "state": "",
         *           "address": "",
         *           "businessRole": "Employee",
         *           "email": "",
         *           "phone": "",
         *           "salonName": ""
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
         *       "coordinates": []
         *   }
         *
         * @method getProfile
         * @instance
         */

        var userId = req.params.userId || req.session.uId;
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
         *      "success": "User updated successfully"
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
         *      "coordinates": [150, -78]
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
        var userId = req.params.id;
        var query = req.query;
        var page = (query.page >=1) ? query.page : 1;
        var limit = (query.limit >=1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_PHOTOS;
        var findObj = {};
        var populateArray = [
            {path: 'serviceType', select: 'name'}
        ];

        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
            findObj.client = req.session.uId;
            populateArray.push({path: 'stylist', select: 'salonInfo.salonName personalInfo.firstName personalInfo.lastName personalInfo.avatar'});
        }

        if (req.session.role === CONSTANTS.USER_ROLE.STYLIST){
            if (!userId){
                return next(badRequests.NotEnParams({reqParams: 'id'}));
            }

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
                return next(badRequests.InvalidValue({value: userId, param: 'id'}));
            }

            findObj.client = userId;
            findObj.stylist = req.session.uId;
            populateArray.push({path: 'client', select: 'personalInfo.firstName personalInfo.lastName'});
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
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

                            if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
                                delete modelJSON.client;

                                if (modelJSON.stylist.personalInfo.avatar){
                                    modelJSON.avatar = image.computeUrl(modelJSON.stylist.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                                } else {
                                    modelJSON.avatar = '';
                                }
                            }

                            if (req.session.role === CONSTANTS.USER_ROLE.STYLIST){
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
        var sortParam = req.query.sort;
        var order = (req.query.order === '1') ? 1 : -1;
        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_APPOINTMENTS;
        var appointmentStatus;
        var userId = req.session.uId;
        var search = req.query.search;

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

            getAllUserAppointments(userId, req.session.role, appointmentStatus, page, limit, sortParam, order, search, function(err, result){
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

                    for (var i = 0, n = allServiceModels.length; i < n; i++){
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
