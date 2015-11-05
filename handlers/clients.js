var badRequests = require('../helpers/badRequests');
var async = require('async');
var ImageHandler = require('./image');
var mongoose = require('mongoose');
var CONSTANTS = require('../constants');

var ClientsHandler = function (app, db) {

    var User = db.model('User');
    var Appointment = db.model('Appointment');
    var Gallery = db.model('Gallery');
    var Subscription = db.model('Subscription');
    var ServiceType = db.model('ServiceType');
    var SubscriptionType = db.model('SubscriptionType');
    var imageHandler = new ImageHandler(db);
    var ObjectId = mongoose.Types.ObjectId;


    /*  this.updateProfile = function (req, res, next) {
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
     */

    this.getActiveSubscriptions = function (req, res, next) {
        var clientId = req.session.uId;

        Subscription
            .find({client: clientId, expirationDate: {$gte: new Date()}})
            .populate({path: 'subscriptionType', select: 'name price logo'})
            .exec(function (err, subscriptionModelsArray) {
                if (err) {
                    return next(err);
                }

                ServiceType
                    .find({}, {__v: 0}, function (err, serviceTypeModels) {
                        var allowServicesArray = [];
                        var resultArray;

                        if (err) {
                            return next(err);
                        }

                        subscriptionModelsArray.map(function (model) {
                            allowServicesArray = allowServicesArray.concat(model.allowServices);

                            return;
                        });

                        resultArray = serviceTypeModels.map(function (model) {
                            var modelJSON = model.toJSON();
                            var typeId = modelJSON._id.toString();
                            modelJSON.havePackage = false;

                            if (allowServicesArray.indexOf(typeId) !== -1) {
                                modelJSON.havePackage = true;
                            }

                            modelJSON.logo = imageHandler.computeUrl(modelJSON.logo, CONSTANTS.BUCKET.IMAGES);

                            return modelJSON;
                        });

                        res.status(200).send(resultArray);
                    });

            });
    };

    this.buySubscriptions = function(req, res, next){
        var clientId = req.session.uId;
        var body = req.body;
        var ids;

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            if (!req.params.clientId){
                return next(badRequests.NotEnParams({reqParams: 'clientId'}))
            }

            clientId = req.params.clientId;
        }

        ids = body.ids.toObjectId();

        async.each(ids,

            function(id, cb){
                var currentDate = new Date();
                var expirationDate = new Date();
                var saveObj;
                var subscriptionModel;

                expirationDate = expirationDate.setMonth(expirationDate.getMonth() + 1);

                saveObj = {
                    client: clientId,
                    subscriptionType : id,
                    //TODO: price: 111,
                    purchaseDate: currentDate,
                    expirationDate: expirationDate
                };

                subscriptionModel = new Subscription(saveObj);

                subscriptionModel
                    .save(function(err){
                        if (err){
                            return cb(err);
                        }

                        cb();
                    });
            },

            function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Subscriptions purchased successfully'});
            });
    };

    this.createAppointment = function (req, res, next) {
        var body = req.body;
        var appointmentModel;
        var saveObj;
        var clientId = req.session.uId;
        var clientLoc;
        var locationAddress = req.body.location;

        if (!body.serviceType || !body.bookingDate) {
            return next(badRequests.NotEnParams({reqParams: 'clientId and serviceType and bookingDate'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            if (!body.clientId){
                return next(badRequests.NotEnParams({reqParams: 'clientId'}));
            }

            clientId = body.clientId;

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)) {
                return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
            }
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(body.serviceType)) {
            return next(badRequests.InvalidValue({value: body.serviceType, param: 'serviceType'}));
        }

        async.series([

            function (cb) {
                User
                    .findOne({_id: clientId}, function (err, clientModel) {
                        if (err) {
                            return cb(err);
                        }

                        if (!clientModel) {
                            return cb(badRequests.DatabaseError());
                        }

                        clientLoc = clientModel.get('loc');

                        if (locationAddress) {
                            //TODO: convert address to coordinates for CMS
                            //var coordinates = locationAddress to coordinates
                            //clientLoc.coordinates = coordinates;
                        }

                        if (!clientLoc || !clientLoc.coordinates.length) {
                            return cb(badRequests.UnknownGeoLocation());
                        }

                        cb();
                    });
            },

            function (cb) {
                Appointment
                    .findOne({client: clientId, bookingDate: body.bookingDate}, function (err, model) {
                        var error;

                        if (err) {
                            return cb(err);
                        }

                        if (model) {
                            error = new Error('Client already have an appointment for this time');
                            error.status = 400;

                            return cb(error);
                        }

                        cb();
                    });
            },

            function (cb) {
                saveObj = {
                    client: ObjectId(clientId),
                    clientLoc: clientLoc,
                    serviceType: ObjectId(body.serviceType),
                    bookingDate: body.bookingDate,
                    status: CONSTANTS.STATUSES.APPOINTMENT.CREATED
                };

                appointmentModel = new Appointment(saveObj);

                appointmentModel
                    .save(function (err) {
                        var appointmentId;

                        if (err) {
                            return cb(err);
                        }

                        appointmentId = appointmentModel.get('_id').toString();

                        cb(null, appointmentId);
                    });
            }

        ], function (err, result) {
            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'Appointment created successfully', appointmentId: result[2]});
        });
    };

    this.rateAppointmentById = function (req, res, next) {
        var clientId = req.session.uId;
        var body = req.body;
        var rateComment;
        var appointmentId;

        if (!body.appointmentId || !isNaN(body.rate)) {
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and rate'}));
        }

        appointmentId = body.appointmentId;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        if (body.rateComment) {
            rateComment = body.rateComment;
        }

        Appointment
            .findOneAndUpdate({_id: appointmentId, client: clientId}, {
                $set: {
                    rate: body.rate,
                    rateComment: rateComment
                }
            }, function (err, appointmentModel) {
                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.DatabaseError());
                }

                res.status(200).send({success: 'Your appointment rated successfully'});
            });
    };

    this.addPhotoToGallery = function (req, res, next) {
        var clientId = req.session.uId;
        var appointmentId = req.body.appointmentId;
        var imageString = req.body.image;
        var stylistId = req.body.stylistId;

        if (!appointmentId || !imageString || !stylistId) {
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and image and stylistId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(stylistId)) {
            return next(badRequests.InvalidValue({value: stylistId, param: 'stylistId'}));
        }

        Appointment
            .findOne({_id: appointmentId, client: clientId, stylist: stylistId}, function (err, appointmentModel) {
                var galleryModel;
                var saveObj;

                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.DatabaseError());
                }

                saveObj = {
                    clientId: clientId,
                    stylistId: stylistId,
                    appointment: ObjectId(appointmentId)
                };

                galleryModel = new Gallery(saveObj);

                galleryModel
                    .save(function (err) {
                        var imageName;

                        if (err) {
                            return next(err);
                        }

                        imageName = galleryModel.get('_id').toString();

                        imageHandler.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, function (err) {
                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'Your photo was added to gallery'});
                        });
                    });
            });
    };

};

module.exports = ClientsHandler;

