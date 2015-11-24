
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

    var self = this;

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

    this.getCoordinatesByLocation = function(locationAddress, callback){
        geocoder.geocode(locationAddress, function(err, data){
            var coordinates = [];
            var longitude;
            var latitude;

            if (err){
                return callback(err);
            }

            if (!data || !data.results.length || !data.results[0].geometry || !data.results[0].geometry.location || data.status !== 'OK'){
                return callback(badRequests.UnknownGeoLocation());
            }

            coordinates[0] = data.results[0].geometry.location.lng;
            coordinates[1] = data.results[0].geometry.location.lat;

            if (!Array.isArray(coordinates) || coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
                return callback(badRequests.UnknownGeoLocation());
            }

            longitude = coordinates[0];
            latitude = coordinates[1];

            if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
                return callback(badRequests.UnknownGeoLocation());
            }

            callback(null, coordinates);
        });
    };

    this.getServicesWithActiveSubscriptions = function (req, res, next) {

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
         * @method getServicesWithActiveSubscriptions
         * @instance
         */

        var clientId = req.session.uId;

        Subscription
            .find({'client.id': ObjectId(clientId), expirationDate: {$gte: new Date()}})
            .populate({path: 'subscriptionType.id'})
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
                            if (model.subscriptionType && model.subscriptionType.id){
                                allowServicesArray = allowServicesArray.concat(model.subscriptionType.id.allowServices);
                            }

                            return;
                        });

                        allowServicesArray = allowServicesArray.toStringObjectIds();

                        resultArray = serviceTypeModels.map(function (model) {
                            var modelJSON = model.toJSON();
                            var typeId = modelJSON._id.toString();

                            modelJSON.havePackage = (allowServicesArray.indexOf(typeId) !== -1);

                            if (modelJSON.logo){
                                modelJSON.logo = imageHandler.computeUrl(modelJSON.logo, CONSTANTS.BUCKET.IMAGES);
                            } else {
                                modelJSON.logo = '';
                            }

                            return modelJSON;
                        });

                        res.status(200).send(resultArray);
                    });
            });
    };

    this.buySubscriptions = function(clientId, clientName, subscriptionId, callback){

        SubscriptionType
            .findOne({_id: subscriptionId}, {name: 1}, function(err, subscription){
                var expirationDate = new Date();
                var saveObj;
                var subscriptionModel;

                if (err){
                    return callback(err);
                }

                if (!subscription){
                    err = new Error('Subscription not found');
                    err.status = 400;
                    return callback(err);
                }

                expirationDate = expirationDate.setMonth(expirationDate.getMonth() + 1);

                saveObj = {
                    client: {
                        id: clientId,
                        firstName: clientName.firstName,
                        lastName: clientName.lastName
                    },
                    subscriptionType : {
                        id: subscription._id,
                        name: subscription.name
                    },
                    //TODO: price: 111,
                    expirationDate: expirationDate
                };

                subscriptionModel = new Subscription(saveObj);

                subscriptionModel
                    .save(function(err){
                        if (err){
                            return callback(err);
                        }

                        callback(null);
                    });
            });
    };

    this.buySubscriptionsByClient = function(req, res, next){

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
         *  "id": "5638b946f8c11d9c0408133f"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Subscriptions bought successfully"
         *  }
         *
         * @method buySubscriptions
         * @instance
         */

        var clientId = req.session.uId;
        var body = req.body;
        var id;

        if (!body.id) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        if (req.session.role === CONSTANTS.USER_ROLE.ADMIN){
            if (!req.params.clientId){
                return next(badRequests.NotEnParams({reqParams: 'clientId'}));
            }

            clientId = req.params.clientId;

            if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
                return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
            }
        }

        id = ObjectId(body.id);

        User
            .findOne({_id: clientId}, {'personalInfo.firstName': 1, 'personalInfo.lastName': 1, 'payments.customerId': 1}, function(err, userModel){
                var clientName;
                var customerId;

                if (err){
                    return next(err);
                }

                if (!userModel){
                    return next(badRequests.NotFound({target: 'Client'}));
                }

                customerId = userModel.payments.customerId;

                clientName = {
                    firstName: userModel.personalInfo.firstName,
                    lastName: userModel.personalInfo.lastName
                };

                self.buySubscriptions(clientId, clientName, id, function(err){

                    if (err){
                        return next(err);
                    }

                    stripe
                        .createSubscription(customerId, {plan: id.toString()}, function(err, subscription){

                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'Subscriptions bought successfully', subscriptions: subscription});

                        });
                });
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
         * This __method__ allows book appointment by _Client_
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
        var clientFirstName;
        var clientLastName;
        var serviceTypeName;

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

            function(cb){
                var statuses = CONSTANTS.STATUSES.APPOINTMENT;

                Appointment
                    .find({'client.id': clientId, status: {$in: [statuses.CREATED, statuses.CONFIRMED, statuses.BEGINS]}}, function(err, modelsArray){
                        var error;

                        if (err){
                            return cb(err);
                        }

                        if (modelsArray.length >= CONSTANTS.LIMIT.NOT_FINISHED_APPOINTMENTS){
                            error = new Error('You already have two not finished appointments');
                            error.status = 400;

                            return cb(error);
                        }

                        cb();
                    });
            },

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
                        clientLoc.address = '';

                        clientFirstName = clientModel.personalInfo.firstName || '';
                        clientLastName = clientModel.personalInfo.lastName || '';

                        if (req.session.role === CONSTANTS.USER_ROLE.CLIENT){
                            if (body.coordinates){
                                clientLoc.coordinates = body.coordinates;
                            }
                        }

                        if (locationAddress) {
                            self.getCoordinatesByLocation(locationAddress, function(err, coordinates){
                                if (err){
                                    return cb(err);
                                }

                                clientLoc.coordinates = coordinates;
                                clientLoc.address = locationAddress;

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
                    .findOne({'client.id': clientId, bookingDate: body.bookingDate}, function (err, model) {
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
                    .find({'client.id': ObjectId(clientId), expirationDate: {$gte: body.bookingDate}})
                    .populate({path: 'subscriptionType.id', select: 'allowServices'})
                    .exec(function(err, subscriptionModelsArray){
                        var allowedServices = [];

                        if (err){
                            return cb(err);
                        }

                        subscriptionModelsArray.map(function(model){
                            var servicesIds;

                            if (model.subscriptionType && model.subscriptionType.id){

                                servicesIds = model.get('subscriptionType.id.allowServices');
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

            function(cb){
                ServiceType
                    .findOne({_id: body.serviceType}, {name: 1}, function(err, serviceTypeModel){
                        if (err){
                            return cb(err);
                        }

                        if (!serviceTypeModel){
                            return cb(badRequests.NotFound({target: 'ServiceType'}))
                        }

                        serviceTypeName = serviceTypeModel.get('name');

                        cb();
                    });
            },

            function (cb) {
                saveObj = {
                    client: {
                        id: ObjectId(clientId),
                        firstName: clientFirstName,
                        lastName: clientLastName
                    },
                    clientLoc: clientLoc,
                    serviceType: {
                        id: ObjectId(body.serviceType),
                        name: serviceTypeName
                    },
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

            userCoordinates = result[1];
            appointmentId = result[5];

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
         *      "rateComment":"Nice maniqure",
         *      "tip": 5
         *  }
         *
         * @param {string} appointmentId - Appointment id
         * @param {number} rate - Booking rate for appointment 0-9
         * @param {string} [rateComment] - rate comment for appointment
         * @param {number} tip - tip payed to stylist (>=0)
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
        var tip;

        if (!body.appointmentId || isNaN(body.rate) || isNaN(body.tip)) {
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and rate and tip'}));
        }

        appointmentId = body.appointmentId;
        tip = (body.tip > 0) ? body.tip : 0;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        if (body.rateComment) {
            rateComment = body.rateComment;
        }

        Appointment
            .findOneAndUpdate({_id: appointmentId, 'client.id': ObjectId(clientId)}, {
                $set: {
                    rate: body.rate,
                    rateComment: rateComment,
                    tip: tip
                }
            }, function (err, appointmentModel) {
                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                //TODO: write off tip from clients card

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

        var body = req.body;
        var clientId = req.session.uId;
        var appointmentId = body.appointmentId;
        var imageString = body.image;

        if (!appointmentId || !imageString) {
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and image'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOne({_id: appointmentId, 'client.id': ObjectId(clientId)}, function (err, appointmentModel) {
                var galleryModel;
                var saveObj;
                var stylistId;
                var serviceType;
                var bookingDate;

                if (err) {
                    return next(err);
                }

                if (!appointmentModel || !appointmentModel.stylist || !appointmentModel.stylist.id || !appointmentModel.serviceType || !appointmentModel.serviceType.id) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                stylistId = appointmentModel.get('stylist.id');
                serviceType = appointmentModel.get('serviceType.id');
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

                            res.status(200).send({success: 'Your photo was added to gallery', photoId: imageName});
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
                    return callback(badRequests.NotFound({target: 'User'}));
                }

                callback(null, user.payments.customerId);
            });

    }

    this.addCardInfo = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/client/card`__
         *
         * This __method__ allows to add credit card to _Client_ profile
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/client/card
         *
         * @example Body example:
         *
         *  {
         *      "stripeToken": "tok_arjfi12938esa"
         *  }
         *
         * @param {string} stripeToken - Obtained from Stripe
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *   {
         *      success: 'Card added successfully'
         *   }
         *
         * @method addCardInfo
         * @instance
         */

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

    this.createCharge = function(req, res, next){
        var body = req.body;
        var clientId = req.session.uId;

        if (!body.amount || !body.currency){
            return next(badRequests.NotEnParams({reqParams: 'amount and currency'}));
        }

        async
            .waterfall([
                function(cb){
                    User
                        .findOne({_id: clientId}, {'payments.customerId': 1}, function(err, clientModel){
                            if (err){
                                return cb(err);
                            }

                            if (!clientModel){
                                err = new Error('Client not found');
                                err.status = 404;
                                return cb(err);
                            }

                            cb(null, clientModel.payments.customerId);
                        });
                },

                function(customerId, cb){
                    var data = {
                        amount: body.amount,
                        currency: body.currency,
                        customer: customerId
                    };

                    stripe
                        .createCharge(data, function(err, charge){

                            if (err){
                                return cb(err);
                            }

                            cb(null, charge);

                        });
                }
            ], function(err, charge){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Charges create successfully', charge: charge});
            });


    };



};

module.exports = ClientsHandler;

