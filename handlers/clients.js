
/**
 * @description Client management module
 * @module Client
 *
 */


var badRequests = require('../helpers/badRequests');
var async = require('async');
var ImageHandler = require('./image');
var mongoose = require('mongoose');
var CONSTANTS = require('../constants');
var geocoder = require('geocoder');
var SchedulerHelper = require('../helpers/scheduler');
var StripeModule = require('../helpers/stripe');
var _ = require('lodash');

var ClientsHandler = function (app, db) {

    var stripe = new StripeModule();
    var User = db.model('User');
    var Appointment = db.model('Appointment');
    var Gallery = db.model('Gallery');
    var Subscription = db.model('Subscription');
    var ServiceType = db.model('ServiceType');
    var SubscriptionType = db.model('SubscriptionType');
    var imageHandler = new ImageHandler(db);
    var ObjectId = mongoose.Types.ObjectId;
    var schedulerHelper = new SchedulerHelper(app, db);

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

    this.getActiveSubscriptionsOnServices = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/subscriptions/`__
         *
         * This __method__ allows get services with active subscriptions by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/subscriptions
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  [
         *      {
         *          "_id": "5638ccde3624f77b33b6587d",
         *          "name": "Manicure",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638ccde3624f77b33b6587c.png",
         *          "havePackage": false
         *      },
         *      {
         *           "_id": "56408f8281c43c3a24a332fa",
         *           "name": "Pedicure",
         *           "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/56408f8281c43c3a24a332f9.png",
         *           "havePackage": true
         *      }
         *  ]
         *
         * @method getActiveSubscriptionsOnServices
         * @instance
         */

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

    this.getCurrentSubscriptions = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/subscriptions/current/`__
         *
         * This __method__ allows get current subscriptions by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/subscriptions/current
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  [
         *      {
         *          "_id": "5638b946f8c11d9c0408133f",
         *          "name": "Unlimited Pass",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b946f8c11d9c0408133e.png",
         *          "price": 135,
         *          "purchased": false
         *      },
         *      {
         *          "_id": "5638b965f8c11d9c04081341",
         *          "name": "Unlimited Maniqure",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b965f8c11d9c04081340.png",
         *          "price": 49,
         *          "purchased": false
         *      },
         *      {
         *           "_id": "5638b976f8c11d9c04081343",
         *           "name": "Unlimited Blowout",
         *           "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b976f8c11d9c04081342.png",
         *           "price": 99,
         *           "purchased": true
         *      }
         * ]
         *
         * @method getCurrentSubscriptions
         * @instance
         */

        var clientId = req.session.uId;
        var role = req.session.role;

        if (role === CONSTANTS.USER_ROLE.ADMIN){
            clientId = req.params.clientId;

            if (!clientId){
                return next(badRequests.NotEnParams({reqParams: 'clientId'}));
            }

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
                return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
            }
        }

        Subscription
            .find({client: clientId, expirationDate: {$gte: new Date()}}, {__v: 0, client: 0})
            .populate({path: 'subscriptionType', select: 'name price logo'})
            .exec(function (err, subscriptionModelsArray) {
                var currentSubscriptions;

                if (err) {
                    return next(err);
                }

                if (role === CONSTANTS.USER_ROLE.CLIENT){
                    SubscriptionType
                        .find({}, {__v: 0, allowServices: 0}, function (err, subscriptionTypeModels) {
                            var resultArray;
                            var subscriptionIds;

                            if (err) {
                                return next(err);
                            }

                            subscriptionIds = subscriptionModelsArray.map(function(model){
                                if (model.subscriptionType){
                                    return (model.get('subscriptionType._id')).toString();
                                }
                            });

                            resultArray = subscriptionTypeModels.map(function (model) {
                                var modelJSON = model.toJSON();
                                var typeId = modelJSON._id.toString();

                                if (subscriptionIds.indexOf(typeId) !== -1) {
                                    modelJSON.purchased = true;
                                } else {
                                    modelJSON.purchased = false;
                                }

                                if (modelJSON.logo){
                                    modelJSON.logo = imageHandler.computeUrl(modelJSON.logo, CONSTANTS.BUCKET.IMAGES);
                                } else {
                                    modelJSON.logo = '';
                                }

                                return modelJSON;
                            });

                            res.status(200).send(resultArray);
                        });
                } else {
                    currentSubscriptions = subscriptionModelsArray.map(function(model){
                        var modelJSON = model.toJSON();

                        if (modelJSON.subscriptionType){
                            modelJSON.package = modelJSON.subscriptionType.name;
                            modelJSON.price = modelJSON.subscriptionType.price;
                        } else {
                            modelJSON.package = 'Package was removed';
                            modelJSON.price = '-';
                        }

                        delete modelJSON.subscriptionType;
                        delete modelJSON.expirationDate;

                        return modelJSON;
                    });

                    res.status(200).send(currentSubscriptions);
                }


            });
    };

    this.buySubscriptions = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/subscriptions`__
         *
         * This __method__ allows buy subscriptions by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/subscriptions
         *
         * @example Body example:
         * {
         *  "ids": ["5638b946f8c11d9c0408133f"]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Subscriptions purchased successfully"
         *  }
         *
         * @method buySubscriptions
         * @instance
         */

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

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
                return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
            }
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

                //if need check for purchased subscriptions
                /*SubscriptionType
                    .findOne({_id: id}, function (err, subscriptionTypesModel) {
                        var currentDate = new Date();
                        var expirationDate = new Date();


                        if (err) {
                            return cb(err);
                        }

                        if (!subscriptionTypesModel) {
                            return cb(badRequests.NotFound({target: 'Subscription with id: ' + id}));
                        }
                        Subscription
                            .findOne({
                                subscriptionType: id,
                                client: ObjectId(clientId),
                                expirationDate: {$gte: currentDate}
                            }, function (err, someSubscriptionModel) {
                                var error;
                                var saveObj;
                                var subscriptionModel;

                                if (err) {
                                    return cb(err);
                                }

                                if (someSubscriptionModel) {
                                    error = new Error('Current user already have ' + subscriptionTypesModel.name);
                                    error.status = 400;

                                    return cb(error);
                                }

                                expirationDate = expirationDate.setMonth(expirationDate.getMonth() + 1);

                                saveObj = {
                                    client: clientId,
                                    subscriptionType: id,
                                    //TODO: price: 111,
                                    purchaseDate: currentDate,
                                    expirationDate: expirationDate
                                };

                                subscriptionModel = new Subscription(saveObj);

                                subscriptionModel
                                    .save(function (err) {
                                        if (err) {
                                            return cb(err);
                                        }

                                        cb();
                                    });
                            });
                    });*/
            },

            function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Subscriptions purchased successfully'});
            });
    };

    this.createAppointment = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/appointment`__
         *
         * This __method__ allows create appointment by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/appointment
         *
         * @example Body example:
         *  {
         *      "serviceType":"5638ccde3624f77b33b6587d",
         *      "bookingDate":"2015-11-08T10:17:49.060Z"
         *  }
         *
         * @param {string} serviceType - Service id
         * @param {string} bookingDate - Booking date for appointment
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Appointment created successfully",
         *      "appointmentId": "5645c795edba02100fa1e6f8"
         *  }
         *
         * @method createAppointment
         * @instance
         */

        var body = req.body;
        var appointmentModel;
        var saveObj;
        var clientId = req.session.uId;
        var clientLoc;
        var locationAddress;
        var oneTimeService = true;

        if (!body.serviceType || !body.bookingDate) {
            return next(badRequests.NotEnParams({reqParams: 'clientId and serviceType and bookingDate'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            if (!body.clientId || !body.location){
                return next(badRequests.NotEnParams({reqParams: 'clientId and location'}));
            }

            clientId = body.clientId;
            locationAddress = body.location;

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

                        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
                            if (body.coordinates){
                                clientLoc.coordinates = body.coordinates;
                            }
                        }

                        if (locationAddress) {
                            geocoder.geocode(locationAddress, function(err, data){
                                if (err){
                                    return cb(err);
                                }

                                if (!data || !data.results.length || !data.results[0].geometry || !data.results[0].geometry.location || data.status !== 'OK'){
                                    return cb(badRequests.UnknownGeoLocation());
                                }

                                clientLoc.coordinates[0] = data.results[0].geometry.location.lng;
                                clientLoc.coordinates[1] = data.results[0].geometry.location.lat;

                                if (!clientLoc || !clientLoc.coordinates.length) {
                                    return cb(badRequests.UnknownGeoLocation());
                                }

                                cb(null, clientLoc.coordinates);
                            });
                        } else {
                            if (!clientLoc || !clientLoc.coordinates.length) {
                                return cb(badRequests.UnknownGeoLocation());
                            }

                            cb(null, clientLoc.coordinates);
                        }
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

            //onetime service or not
            function(cb){
                Subscription
                    .find({client: clientId, expirationDate: {$gte: body.bookingDate}})
                    .populate({path: 'subscriptionType', select: 'allowServices'})
                    .exec(function(err, subscriptionModelsArray){
                        var allowedServices = [];

                        if (err){
                            return cb(err);
                        }

                        subscriptionModelsArray.map(function(model){
                            var servicesIds;

                            if (model.subscriptionType){

                                servicesIds = model.get('subscriptionType.allowServices');
                                servicesIds = servicesIds.toStringObjectIds();

                                allowedServices = allowedServices.concat(servicesIds);
                            }
                        });

                        if (allowedServices.indexOf(body.serviceType) !== -1){
                            oneTimeService = false
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
                    status: CONSTANTS.STATUSES.APPOINTMENT.CREATED,
                    oneTimeService: oneTimeService
                };

                appointmentModel = new Appointment(saveObj);

                appointmentModel
                    .save(function (err) {
                        var appointmentId;

                        if (err) {
                            return cb(err);
                        }

                        appointmentId = (appointmentModel.get('_id')).toString();

                        cb(null, appointmentId);
                    });
            }

        ], function (err, result) {
            var appointmentId;
            var userCoordinates;

            if (err) {
                return next(err);
            }

            userCoordinates = result[0];
            appointmentId = result[3];

            schedulerHelper.startLookStylistForAppointment(appointmentId, userCoordinates, body.serviceType);

            res.status(200).send({success: 'Appointment created successfully', appointmentId: appointmentId});
        });
    };

    this.rateAppointmentById = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/appointment/rate`__
         *
         * This __method__ allows rate appointment by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/appointment/rate
         *
         * @example Body example:
         *
         *  {
         *      "appointmentId":"5644a3453f00c1f81c25b548",
         *      "rate": 8,
         *      "rateComment":"Nice maniqure"
         *  }
         *
         * @param {string} appointmentId - Appointment id
         * @param {number} rate - Booking rate for appointment 0-9
         * @param {string} [rateComment] - rate comment for appointment
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Your appointment rated successfully"
         *  }
         *
         * @method rateAppointmentById
         * @instance
         */

        var clientId = req.session.uId;
        var body = req.body;
        var rateComment = '';
        var appointmentId;

        if (!body.appointmentId || isNaN(body.rate)) {
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
            .findOneAndUpdate({_id: appointmentId, client: ObjectId(clientId)}, {
                $set: {
                    rate: body.rate,
                    rateComment: rateComment
                }
            }, function (err, appointmentModel) {
                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Your appointment rated successfully'});
            });
    };

    this.addPhotoToGallery = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/gallery`__
         *
         * This __method__ allows to add photo to gallery by _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/gallery
         *
         * @example Body example:
         *
         *  {
         *      "appointmentId":"5644a3453f00c1f81c25b548",
         *      "image": "data:image/png;base64, /9j/4AAQSkZJRgABAQA..."
         *  }
         *
         * @param {string} appointmentId - Appointment id
         * @param {string} image - base64
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Your photo was added to gallery"
         *  }
         *
         * @method addPhotoToGallery
         * @instance
         */

        var clientId = req.session.uId;
        var appointmentId = req.body.appointmentId;
        var imageString = req.body.image;

        if (!appointmentId || !imageString /*|| !stylistId*/) {
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and image and stylistId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOne({_id: appointmentId, client: clientId}, function (err, appointmentModel) {
                var galleryModel;
                var saveObj;
                var stylistId;
                var serviceType;
                var bookingDate;

                if (err) {
                    return next(err);
                }

                if (!appointmentModel || !appointmentModel.stylist || !appointmentModel.serviceType) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                stylistId = appointmentModel.get('stylist');
                serviceType = appointmentModel.get('serviceType');
                bookingDate = appointmentModel.get('bookingDate');

                saveObj = {
                    client: ObjectId(clientId),
                    stylist: stylistId,
                    serviceType: serviceType,
                    bookingDate: bookingDate
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

    //payments

    function getCustomerId(userId, callback){

        User
            .findOne({_id: userId}, {'payments.customerId': 1}, function(err, user){
                if (err){
                    return callback(err);
                }

                if (!user){
                    err = new Error('User not found');
                    err.status = 400;
                    return callback(err);
                }

                callback(null, user.payments.customerId);
            });

    }

    this.addCardInfo = function (req, res, next) {

        var userId = req.session.uId;
        var body = req.body;

        getCustomerId(userId, function (err, customerId) {
            stripe
                .addCard(customerId, {source: body.stripeToken}, function (err) {

                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'Card added successfully'});

                });
        });
    };

    this.getListCards = function (req, res, next) {

        var userId = req.session.uId;

        getCustomerId(userId, function (err, customerId) {

            if (err){
                return next(err);
            }

            stripe.getCustomerCards(customerId, function (err, cards) {

                if (err) {
                    return next(err);
                }

                res.status(200).send(cards);

            });
        });
    };

    this.updateCard = function(req, res, next){
        var body = req.body;
        var cardId = req.params.cardId;
        var userId = req.session.uId;

        getCustomerId(userId, function(err, customerId){

            if (err){
                return next(err);
            }

            stripe
                .updateCustomerCard(customerId, cardId, body, function(err, card){

                    if (err){
                        return next(err);
                    }

                    res.status(200).send({success: 'Card updated successfully'});

                });
        });

    };

    this.removeCard = function(req, res, next){
        var cardId = req.params.cardId;
        var userId = req.session.uId;

        getCustomerId(userId, function(err, customerId){

            if (err){
                return next(err);
            }

            stripe
                .removeCustomerCard(customerId, cardId, function(err, confirmation){

                    if (err){
                        return next(err);
                    }

                    res.status(200).send(confirmation);

                });

        });

    };



};

module.exports = ClientsHandler;

