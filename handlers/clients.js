var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var async = require('async');
var ImageHandler = require('./image');
var mongoose = require('mongoose');
var CONSTANTS = require('../constants');

var ClientsHandler = function (app, db) {

    var Client = db.model('Client');
    var Appointment = db.model('Appointment');
    var session = new SessionHandler();
    var imageHandler = new ImageHandler(db);
    var ObjectId = mongoose.Types.ObjectId;

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signIn = function (req, res, next) {

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

                    if (token) {
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
        var saveData = {
            clientDetails: {}
        };

        if (!body.password || !body.email || !body.firstName || !body.lastName || !body.phone) {
            return next(badRequests.NotEnParams({reqParams: 'password or email or firstName or lastName or phone'}));
        }

        email = body.email;

        if (!validator.isEmail(email)) {
            return next(badRequests.InvalidEmail());
        }

        email = validator.escape(email);

        saveData.token = token;
        saveData.email = email;
        saveData.password = getEncryptedPass(body.password);
        saveData.clientDetails.firstName = body.firstName;
        saveData.clientDetails.lastName = body.lastName;
        saveData.clientDetails.phone = body.phone;

        clientModel = new Client(saveData);

        clientModel
            .save(function (err) {
                if (err) {
                    return next(err);
                }

                mailer.confirmRegistration({
                    name: body.firstName + ' ' + body.lastName,
                    email: email,
                    password: body.password,
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

                if (!clientModel) {
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

                if (!result) {
                    return res.status(200).send({success: 'Check your email'});
                }

                mailer.forgotPassword(result.toJSON(), CONSTANTS.USER_STATUS.BUSINESS.toLowerCase());

                res.status(200).send({success: 'Check your email'});

            });

    };

    this.confirmForgotPass = function (req, res, next) {
        var forgotToken = req.params.forgotToken;

        Client
            .findOneAndUpdate({forgotToken: forgotToken}, {forgotToken: ''}, function (err) {

                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Confirm change password'});

            });

    };

    this.changePassword = function (req, res, next) {

        var forgotToken = req.params.forgotToken;
        var body = req.body;
        var encryptedPassword;

        if (!body.password) {
            return next(badRequests.NotEnParams({params: 'password'}));
        }

        encryptedPassword = getEncryptedPass(body.password);

        Client
            .findOneAndUpdate({forgotToken: forgotToken}, {
                password: encryptedPassword,
                forgotToken: ''
            }, function (err) {

                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Password changed successfully'});

            });

    };

    this.signOut = function (req, res, next) {

        session.kill(req, res, next);
    };

    this.updateProfile = function (req, res, next) {
        var clientId = req.session.uId;
        var options = req.body;

        if (!options.firstName && !options.lastName && !options.phone && !options.email) {
            return next(badRequests.NotEnParams({reqParams: 'firstName or lastName or phone or email'}));
        }

        async.waterfall([

            //find user
            function (cb) {
                Client.findOne({_id: clientId}, function (err, clientModel) {
                    if (err) {
                        return cb(err, null);
                    }

                    if (!clientModel) {
                        return cb(badRequests.DatabaseError(), null);
                    }

                    if (options.firstName) {
                        clientModel.clientDetails.firstName = options.firstName;
                    }

                    if (options.lastName) {
                        clientModel.clientDetails.lastName = options.lastName;
                    }

                    if (options.phone) {
                        clientModel.clientDetails.phone = options.phone;
                    }

                    cb(null, clientModel);
                });
            },

            //check email in use or not
            function (clientModel, cb) {
                var email;

                if (!options.email) {
                    return cb(null, clientModel);
                }

                if (!validator.isEmail(options.email)) {
                    return cb(badRequests.InvalidEmail(), null);
                }

                email = validator.escape(options.email);

                Client.findOne({email: email}, function (err, someClientModel) {
                    var someClientId;

                    if (err) {
                        return cb(err, null);
                    }

                    if (!someClientModel) {
                        clientModel.email = email;
                        return cb(null, clientModel);
                    }

                    someClientId = someClientModel.get('_id').toString();

                    if (someClientId !== clientId) {
                        return cb(badRequests.EmailInUse(), null);
                    } else {
                        return cb(null, clientModel);
                    }

                });
            },

            function (clientModel, cb) {
                clientModel
                    .save(function (err) {
                        if (err) {
                            return cb(err);
                        }

                        cb();
                    });
            }

        ], function (err) {
            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'Client\'s profile updated successfully'});
        });
    };

    this.updateLocation = function (req, res, next) {
        var clientId = req.session.uId;
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

        Client
            .findOneAndUpdate({_id: clientId}, updateObj, function (err, clientModel) {
                if (err) {
                    return next(err);
                }

                if (!clientModel) {
                    return next(badRequests.DatabaseError());
                }

                res.status(200).send({success: 'Coordinates updated successfully'});
            });
    };

    this.getProfile = function (req, res, next) {
        var clientId = req.params.id || req.session.uId;

        if (req.params.id && !CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)) {
            return next(badRequests.InvalidValue({value: clientId, param: 'id'}));
        }

        Client
            .findOne({_id: clientId},
            {
                fbId: 0,
                __v: 0,
                token: 0,
                password: 0,
                forgotToken: 0,
                confirmed: 0
            },
            function (err, clientModel) {
                var resultObj = {
                    avatar: {
                        url: ''
                    }
                };
                var avatarUrl;
                var avatarName;

                if (err) {
                    return next(err);
                }
                if (!clientModel) {
                    return next(badRequests.NotFound({target: 'User'}));
                }

                resultObj.id = clientModel.get('_id');
                resultObj.coordinates = clientModel.get('loc.coordinates');
                resultObj.firstName = clientModel.get('clientDetails.firstName');
                resultObj.lastName = clientModel.get('clientDetails.lastName');
                resultObj.phone = clientModel.get('clientDetails.phone') || '';
                avatarName = clientModel.get('clientDetails.avatar') || '';
                resultObj.email = clientModel.get('email');

                if (avatarName) {
                    avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                    resultObj.avatar.url = avatarUrl;
                }

                res.status(200).send(resultObj);
            });
    };

    this.uploadAvatar = function(req, res, next){
        var clientId = req.session.uId;

        var body = req.body;
        var imageName = imageHandler.createImageName();
        var currentImageName;
        var imageString;

        if (!body || !body.avatar){
            return next(badRequests.NotEnParams({reqParams: 'avatar'}));
        }

        imageString = body.avatar;

        Client
            .findOne({_id: clientId}, {'clientDetails.avatar': 1}, function(err, clientModel){

                if (err){
                    return next(err);
                }

                if (!clientModel){
                    return next(badRequests.DatabaseError());
                }

                currentImageName = clientModel.get('clientDetails.avatar');

                async
                    .series([

                        function(cb) {
                            imageHandler.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb){
                            Client
                                .findOneAndUpdate({_id: clientId}, {'clientDetails.avatar': imageName}, cb);
                        },

                        function(cb) {

                            if (!currentImageName){
                                return cb();
                            }

                            imageHandler.deleteImage(currentImageName, CONSTANTS.BUCKET.IMAGES, cb);
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
        var clientId = req.session.uId;

        Client
            .findOne({_id: clientId}, function(err, clientModel){
                var avatarName;

                if (err){
                    return next(err);
                }

                if (!clientModel){
                    return next(badRequests.DatabaseError());
                }

                avatarName = clientModel.get('clientDetails.avatar');

                clientModel
                    .update({'clientDetails.avatar': ''}, function(err){
                        if (err){
                            return next(err);
                        }

                        if (!avatarName){
                            return res.status(200).send({success: 'Avatar removed successfully'});
                        }

                        imageHandler.deleteImage(avatarName, CONSTANTS.BUCKET.IMAGES, function(err){
                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'Avatar removed successfully'});
                        });
                    });
            });
    };

    this.createAppointment = function(req, res, next){
        var body = req.body;
        var appointmentModel;
        var saveObj;
        var clientId;
        var clientLoc;

        if (!body.clientId || !body.serviceType || !body.bookingDate){
            return next(badRequests.NotEnParams({}));
        }

        clientId = body.clientId;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
            return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(body.serviceType)){
            return next(badRequests.InvalidValue({value: body.serviceType, param: 'serviceType'}));
        }

        async.series([

            function(cb){
                Client
                    .findOne({_id: clientId}, function(err, clientModel){
                        if (err){
                            return cb(err);
                        }

                        if(!clientModel){
                            return cb(badRequests.DatabaseError());
                        }

                        clientLoc = clientModel.get('loc');

                        if (!clientLoc || !clientLoc.coordinates.length){
                            return cb(badRequests.UnknownGeoLocation());
                        }

                        cb();
                    });
            },

            function(cb){
                Appointment
                    .findOne({client: clientId, bookingDate: body.bookingDate}, function(err, model){
                        if (err){
                            return cb(err);
                        }

                        if (model){
                            var error = new Error('You already have an appointment for this time');

                            error.status = 400;

                            return cb(error);
                        }

                        cb();
                    });
            },

            function(cb){
                saveObj = {
                    client: ObjectId(clientId),
                    clientLoc: clientLoc,
                    serviceType: ObjectId(body.serviceType),
                    bookingDate: body.bookingDate,
                    status: CONSTANTS.STATUSES.APPOINTMENT.CREATED
                };

                appointmentModel = new Appointment(saveObj);

                appointmentModel
                    .save(function(err){
                        var appointmentId;

                        if (err){
                            return cb(err);
                        }

                        appointmentId = appointmentModel.get('_id').toString();

                        cb(null, appointmentId);
                    });
            }

        ], function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Appointment created successfully', appointmentId: result[2]});
        });
    };

    this.getAllClientAppointments = function(req, res, next){
        var clientId = req.session.uId;

        Appointment
            .find({client: clientId}, {__v: 0, client: 0, clientLoc: 0, stylist: 0, requestDate: 0, status: 0})
            .populate({path: 'serviceType', select: 'name'})
            .sort({bookingDate: 1})
            .exec(function(err, appointmentModelsArray){
                if (err){
                    return next(err);
                }

                res.status(200).send(appointmentModelsArray);
            });
    };

    this.getClientAppointmentById = function(req, res, next){
        var appointmentId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'id'}));
        }

        Appointment
            .findOne({_id: appointmentId}, {__v: 0, client: 0, clientLoc: 0})
            .populate({path:'stylist', select: 'personalInfo.firstName personalInfo.lastName personalInfo.profession personalInfo.avatar salonInfo.salonName salonInfo.phoneNumber salonInfo.address loc'})
            .populate({path: 'serviceType', select: 'name'})
            .exec(function(err, appointmentModel){
                var stylistAvatarName;

                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                stylistAvatarName = appointmentModel.get('stylist.personalInfo.avatar');

                if (stylistAvatarName){
                    appointmentModel.stylist.personalInfo.avatar = imageHandler.computeUrl(stylistAvatarName, CONSTANTS.BUCKET.IMAGES);
                }

                res.status(200).send(appointmentModel);
            });
    };

    this.cancelByClient = function(req, res, next){
        var clientId = req.session.uId;
        var appointmentId = req.body.appointmentId;
        var cancellationReason = req.body.cancellationReason;

        if (!appointmentId || !cancellationReason){
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and cancellationReason'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOneAndUpdate({_id: appointmentId, client: clientId}, {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_CLIENT, cancellationReason: cancellationReason}}, function(err, appointmentModel){
                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment was canceled by client successfully'});
            });
    };


};

module.exports = ClientsHandler;

