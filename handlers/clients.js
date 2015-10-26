var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var async = require('async');
var ImageHandler = require('./image');
var CONSTANTS = require('../constants');

var ClientsHandler = function (app, db) {

    var Client = db.model('Client');
    var session = new SessionHandler();
    var imageHandler = new ImageHandler(db);

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
        var password;
        var firstName;
        var lastName;
        var phone;
        var saveData = {
            clientDetails: {}
        };

        if (!body.password || !body.email || !body.firstName || !body.lastName || !body.phone) {
            return next(badRequests.NotEnParams({reqParams: 'password or email or firstName or lastName or phone'}));
        }

        email = body.email;
        password = body.password;
        firstName = body.firstName;
        lastName = body.lastName;
        phone = body.phone;

        if (!validator.isEmail(email)) {
            return next(badRequests.InvalidEmail());
        }

        email = validator.escape(email);

        saveData.token = token;
        saveData.email = email;
        saveData.password = getEncryptedPass(password);
        saveData.clientDetails.firstName = firstName;
        saveData.clientDetails.lastName = lastName;
        saveData.clientDetails.phone = phone;

        clientModel = new Client(saveData);

        clientModel
            .save(function (err) {
                if (err) {
                    return next(err);
                }

                mailer.confirmRegistration({
                    name: firstName + ' ' + lastName,
                    email: email,
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
                //resultObj.fullName = resultObj.firstName + ' ' + resultObj.lastName;
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

                            if (!currentImageName){
                                return cb();
                            }

                            imageHandler.deleteImage(currentImageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb) {
                            imageHandler.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb){
                            Client
                                .findOneAndUpdate({_id: clientId}, {'clientDetails.avatar': imageName}, cb);
                        }

                    ], function(err){

                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'Avatar upload successful'});
                    });
            });
    };

};

module.exports = ClientsHandler;

