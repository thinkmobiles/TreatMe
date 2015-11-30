var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var async = require('async');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var ImageHandler = require('./image');
var StripeModule = require('../helpers/stripe');

var StylistHandler = function (app, db) {
    var self = this;

    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');
    var Appointment = db.model('Appointment');
    var Payments = db.model('Payment');
    var StylistPayments = db.model('StylistPayments');
    var User = db.model('User');
    var imageHandler = new ImageHandler();
    var stripe = new StripeModule();
    var io = app.get('io');


    this.checkStylistAvailability = function(availabilityObj, stylistId, appointmentId, callback) {
        var resultModelJSON;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return callback(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOne({_id: appointmentId}, {client: 1, clientLoc: 1, serviceType: 1, status: 1, bookingDate: 1})
            .populate([{path: 'serviceType.id'}, {path: 'client.id', select: 'personalInfo.firstName personalInfo.lastName personalInfo.avatarName'}])
            .exec(function (err, appointmentModel) {
                var status;
                var error;
                var bookingDate;
                var bookDay;
                var bookedHoursAndMinutes;

                if (err) {
                    return callback(err);
                }

                if (!appointmentModel || !appointmentModel.client.id || !appointmentModel.client.id._id) {
                    return callback(badRequests.NotFound({target: 'Appointment'}));
                }

                status = appointmentModel.get('status');

                if (status !== CONSTANTS.STATUSES.APPOINTMENT.CREATED) {
                    error = new Error('Appointment was accepted by somebody else');
                    error.status = 400;

                    return callback(error);
                }

                bookingDate = appointmentModel.get('bookingDate');
                bookDay = bookingDate.getDay();
                bookedHoursAndMinutes = bookingDate.getHours() + ':' + bookingDate.getMinutes();

                console.log('Appointment booked on ' + bookDay + ' day and Booked hours: ' + bookedHoursAndMinutes);

                if (availabilityObj && Object.keys(availabilityObj).length) {

                    for (var i = 0, len = availabilityObj[bookDay].length; i < len; i++) {
                        if (bookedHoursAndMinutes >= availabilityObj[bookDay][i].from && bookedHoursAndMinutes < availabilityObj[bookDay][i].to) {

                            resultModelJSON = appointmentModel.toJSON();
                            resultModelJSON.clientLoc = resultModelJSON.clientLoc.coordinates;
                            resultModelJSON.clientInfo = {
                                name: resultModelJSON.client.firstName + ' ' +resultModelJSON.client.lastName,
                                _id: resultModelJSON.client.id._id.toString()
                            };
                            if (resultModelJSON.client.id.personalInfo.avatar){
                                resultModelJSON.clientInfo.avatar = imageHandler.computeUrl(resultModelJSON.client.id.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                            }
                            resultModelJSON.service = {
                                _id: resultModelJSON.serviceType.id._id.toString(),
                                name: resultModelJSON.serviceType.name
                            };
                            if (resultModelJSON.serviceType.id.logo){
                                resultModelJSON.service.logo = imageHandler.computeUrl(resultModelJSON.serviceType.id.logo, CONSTANTS.BUCKET.IMAGES);
                            }
                            resultModelJSON._id = resultModelJSON._id.toString();

                            delete resultModelJSON.client;
                            delete resultModelJSON.serviceType;


                            if (!stylistId){
                                return callback(null, null);
                            }

                            Appointment
                                .find({stylist: ObjectId(stylistId)}, function(err, stylistAppointmentsArray){
                                    if (err){
                                        return callback(err);
                                    }

                                    if (!stylistAppointmentsArray.length){
                                        return callback(null, resultModelJSON);
                                    }

                                    //check if stylist have appointments for bookingDate, if NO - he is free
                                    stylistAppointmentsArray.map(function(model){
                                        if (model.bookingDate === bookingDate){
                                            return callback(null, null);
                                        }
                                    });

                                    return callback(null, resultModelJSON);
                                });
                        }
                    }
                } else {
                    callback(null, null);
                }
            });
    };


    this.sendRequestForService = function (req, res, next) {

        var uId = req.session.uId;
        var serviceId = req.params.serviceId;
        var serviceModel;
        var name;
        var createObj;

        ServiceType.findOne({_id: ObjectId(serviceId)}, {name: 1}, function (err, resultModel) {

            if (err) {
                return next(err);
            }

            if (!resultModel) {
                return next(badRequests.DatabaseError());
            }

            name = resultModel.get('name');

            Services
                .findOne({stylist: ObjectId(uId), name: name}, function (err, resultModel) {

                    if (err) {
                        return next(err);
                    }

                    if (resultModel) {
                        return res.status(200).send({success: 'You have already requested this service'});
                    }

                    createObj = {
                        stylist: ObjectId(uId),
                        serviceId: ObjectId(serviceId)
                    };

                    serviceModel = new Services(createObj);

                    serviceModel
                        .save(function (err) {

                            if (err) {
                                return next(err);
                            }

                            res.status(200).send({success: 'request succeed'});

                        });

                });
        });
    };

    this.startAppointmentById = function (req, res, next) {
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            startDate: new Date(),
            status: CONSTANTS.STATUSES.APPOINTMENT.BEGINS

        };

        Appointment
            .findOneAndUpdate({
                _id: appointmentId,
                'stylist.id': ObjectId(stylistId)
            }, {$set: updateObj}, function (err, appointmentModel) {
                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment begins successfully'});
            });
    };

    this.acceptAppointmentById = function (req, res, next) {
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;
        var clientId;
        var socketData = {};
        var avatarName;
        var avatarUrl = '';
        var serviceTypeName;
        var serviceTypeLogoName;
        var serviceTypeLogoUrl = '';
        var bookingDate;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        async.waterfall([

            function(cb){
                User
                    .findOne({_id: stylistId}, {'personalInfo.firstName': 1, 'personalInfo.lastName': 1, 'personalInfo.avatar': 1}, function(err, stylistModel){
                        var stylistFirstName;
                        var stylistLastName;

                        if (err){
                            return cb(err);
                        }

                        if (!stylistModel){
                            return cb(badRequests.NotFound({target: 'Stylist'}));
                        }

                        stylistFirstName = stylistModel.get('personalInfo.firstName');
                        stylistLastName = stylistModel.get('personalInfo.lastName');
                        avatarName = stylistModel.get('personalInfo.avatar');

                        if (avatarName){
                            avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                        }

                        updateObj = {
                            stylist: {
                                id: ObjectId(stylistId),
                                firstName: stylistFirstName,
                                lastName: stylistLastName
                            },
                            status: CONSTANTS.STATUSES.APPOINTMENT.CONFIRMED

                        };

                        cb();
                    });
            },

            function(cb){
                Appointment
                    .findOne({_id: appointmentId}, function (err, appointmentModel) {
                        var serviceType;

                        if (err) {
                            return cb(err);
                        }

                        if (!appointmentModel) {
                            return cb(badRequests.NotFound({target: 'Appointment'}));
                        }

                        if ((appointmentModel.stylist && appointmentModel.stylist.id) || appointmentModel.status !== CONSTANTS.STATUSES.APPOINTMENT.CREATED) {
                            var error = new Error('Somebody accepted appointment earlier then you');

                            error.status = 400;

                            return cb(error);
                        }

                        serviceType = appointmentModel.get('serviceType.id');
                        bookingDate = appointmentModel.get('bookingDate');

                        cb(null, serviceType, appointmentModel);
                    });
            },

            function(serviceType, appointmentModel, cb){
                Services
                    .findOne({stylist: ObjectId(stylistId), serviceId: serviceType, approved: true}, {price: 1, oneTimeService: 1}, function(err, serviceModel){
                        var price;

                        if (err){
                            return cb(err);
                        }

                        if (!serviceModel){
                            err = new Error('Stylist don\'t provide this service');
                            err.status = 400;
                            return cb(err);
                        }

                        price = serviceModel.get('price');

                        if (!serviceModel || !price){
                            return cb(badRequests.NotFound({target: 'Service'}));
                        }

                        updateObj.price = price;

                        cb(null, appointmentModel, serviceType);
                    });

            },

            function(appointmentModel, serviceType, cb){
                appointmentModel.price = updateObj.price;
                appointmentModel.stylist = updateObj.stylist;
                appointmentModel.status = updateObj.status;

                appointmentModel
                    .save(function(err, model){
                        var stylistRoom;
                        var sentTo;

                        if (err){
                            return cb(err);
                        }

                        sentTo = appointmentModel.sentTo;

                        if (sentTo && sentTo.length){
                            for (var i = sentTo.length; i>0; i--){
                                stylistRoom = sentTo[i - 1];

                                console.log('=> Remove appointment from map. Send socket event to room: ' + stylistRoom);

                                io.to(stylistRoom).emit('remove appointment from map', {appointmentId: appointmentModel._id.toString()});
                            }
                        }

                       cb(null, model, serviceType);
                    });

            },

            function (appointmentModel, serviceType, cb){

                ServiceType.findOne({_id: serviceType}, {price: 1, name: 1, logo: 1}, function(err, serviceTypeModel){
                    if (err){
                        return cb(err);
                    }

                    if (!serviceTypeModel){
                        return cb(badRequests.DatabaseError());
                    }

                    serviceTypeLogoName = serviceTypeModel.get('logo');
                    serviceTypeName = serviceTypeModel.get('name');

                    if (serviceTypeLogoName){
                        serviceTypeLogoUrl = imageHandler.computeUrl(serviceTypeLogoName, CONSTANTS.BUCKET.IMAGES);
                    }

                    cb(null, appointmentModel, serviceTypeModel.price);

                });
            },

            function(appointmentModel, price, cb){
                var isOneTime = appointmentModel.oneTimeService;
                clientId = appointmentModel.client.id;

                var paymentData = {
                    amount: price * 100,
                    currency: 'usd'
                };

                if (!isOneTime){
                    return cb(null, true, appointmentModel, null);
                }

                self.createCharge(clientId, paymentData, function(err, charge){
                    if (err){
                        return cb(err);
                    }

                    cb(null, false, appointmentModel, charge);
                });

            },

            function(isOneTime, appointmentModel, charge, cb){
                var err;
                var payment;
                var paymentModel;

                if (isOneTime){
                    return cb(null, appointmentModel, 0);
                }

                if (!cb && typeof charge === 'function'){
                    cb = charge;
                    err = new Error('Charge doesn\'t create');
                    err.status = 400;
                    return cb(err);
                }

                payment = {
                    paymentType: 'oneTime',
                    amount: charge.amount,
                    fee: charge.amount * 0.029 + 30,
                    totalAmount: charge.amount * (1 - 0.029) - 30,
                    user: clientId,
                    role: 'client'
                };

                paymentModel = new Payments(payment);

                paymentModel
                    .save(function(err){
                        if (err){
                            return cb(err);
                        }

                        cb(null, appointmentModel, charge.amount);
                    });
            },

            function(appointmentModel, amount, cb){
                var stylistPaymentsModel;
                var paymentsData = {
                    paymentType: 'service',
                    realAmount: amount,
                    stylistAmount: appointmentModel.price * 100,
                    stylist: appointmentModel.stylist.id
                };

                stylistPaymentsModel = new StylistPayments(paymentsData);

                stylistPaymentsModel.save(cb);
            }

        ], function(err){
            var room = clientId.toString();

            if (err) {
                return next(err);
            }

            socketData = {
                _id: appointmentId,
                avatar: avatarUrl,
                service: {
                    name: serviceTypeName,
                    logo: serviceTypeLogoUrl
                },
                bookingDate: bookingDate
            };

            io.to(room).emit('appointment accepted', socketData);

            res.status(200).send({success: 'Appointment accepted successfully'});
        });
    };

    this.finishAppointmentById = function (req, res, next) {
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;
        var socketData;
        var criteria = {
            _id: appointmentId,
            'stylist.id': ObjectId(stylistId),
            status: CONSTANTS.STATUSES.APPOINTMENT.BEGINS
        };

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            endDate: new Date(),
            status: CONSTANTS.STATUSES.APPOINTMENT.SUCCEEDED

        };

        Appointment
            .findOne(criteria)
            .populate([
                {path: 'serviceType.id', select: 'name logo'},
                {path: 'stylist.id', select: 'personalInfo.firstName personalInfo.lastName personalInfo.avatar personalInfo.profession salonInfo.salonName'}
            ])
            .exec(function(err, appointmentModel){
                var avatarName;
                var logo;

                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                avatarName = appointmentModel.get('stylist.id.personalInfo.avatar');
                logo = appointmentModel.get('serviceType.id.logo');

                if (avatarName){
                    avatarName = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                }

                if (logo){
                    logo = imageHandler.computeUrl(logo, CONSTANTS.BUCKET.IMAGES);
                }

                socketData = {
                    stylist: {
                        _id: appointmentModel.get('stylist.id._id').toString(),
                        avatar: avatarName,
                        name: appointmentModel.get('stylist.id.personalInfo.firstName') + ' ' + appointmentModel.get('stylist.id.personalInfo.lastName'),
                        profession: appointmentModel.get('stylist.id.personalInfo.profession')
                    },
                    service: {
                        _id: appointmentModel.get('serviceType.id._id').toString(),
                        name: appointmentModel.get('serviceType.id.name'),
                        logo: logo
                    },
                    bookingDate: appointmentModel.get('bookingDate'),
                    salon: appointmentModel.get('stylist.id.salonInfo.salonName')
                };

                appointmentModel
                    .update({$set: updateObj}, function(err){
                        var room = appointmentModel.get('client.id').toString();

                        if (err){
                            return next(err);
                        }

                        io.to(room).emit('rate stylist', socketData);

                        res.status(200).send({success: 'Appointment finished successfully'});
                    });
            });
    };

    this.updateAvailabilityHours = function (req, res, next) {
        var stylistId = req.session.uId;
        var body = req.body;

        if (!body.availability || !Object.keys(body.availability)) {
            return next(badRequests.NotEnParams({reqParams: 'availability'}));
        }

        User
            .findOne({_id: stylistId, role: CONSTANTS.USER_ROLE.STYLIST}, function (err, stylistModel) {
                var availability;

                if (err) {
                    return next(err);
                }

                if (!stylistModel || !stylistModel.salonInfo || !stylistModel.salonInfo.availability) {
                    return next(badRequests.DatabaseError());
                }

                availability = stylistModel.get('salonInfo.availability');

                for (var key in body.availability) {
                    availability[key] = body.availability[key]
                }

                stylistModel
                    .update({$set: {'salonInfo.availability': availability}}, function (err) {
                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: 'Availability updated successfully'});
                    });
            });
    };

    this.changeOnlineStatus = function(req, res, next){
        var stylistId = req.session.uId;

        User
            .findOne({_id: stylistId}, {online: 1}, function(err, stylistModel){
                var online;

                if (err){
                    return next(err);
                }

                if (!stylistModel){
                    return next(badRequests.DatabaseError());
                }

                online = stylistModel.get('online');
                online = !online;

                stylistModel
                    .update({$set: {online: online}}, function(err){
                        if (err){
                            return next(err);
                        }

                        res.status(200).send({
                            success: 'Your online status changed successfully',
                            online: online
                        });
                    });
            });
    };

    this.addBankAccount = function(req, res, next){
        var body = req.body;
        var uId = req.session.uId;
        var data;
        var token = body.stripeToken;

        async
            .waterfall([
                function(cb){
                    User
                        .findOne({_id: uId}, function(err, userModel){

                            if (err){
                                return cb(err);
                            }

                            if (!userModel){
                                err = new Error('User not found');
                                err.status = 400;
                                return cb(err);
                            }


                            cb(null, userModel);
                        });
                },

                function (userModel, cb){
                    var recipientId = userModel.payments.recipientId;

                    data = {
                        bank_account: token
                    };

                    stripe
                        .addBankAccount(recipientId, data, function(err, recipient){
                            if (err){
                                return cb(err);
                            }

                            if (!recipient){
                                err = new Error('Stripe error');
                                err.status = 400;
                                return cb(err);
                            }

                            cb(null, userModel);
                        });
                }
            ], function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Bank account added successfully'});

            });

    };

    this.createCharge = function(clientId, paymentData, callback){

            if (!paymentData.amount || !paymentData.currency){
            return callback(badRequests.NotEnParams({reqParams: 'amount and currency'}));
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
                        amount: paymentData.amount,
                        currency: paymentData.currency,
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
                    return callback(err);
                }

                callback(null, charge);
            });


    };

    this.getStylistsPaymentsByPeriod = function(req, res, next){
        var body = req.body;
        var start;
        var end;

        if (!body.start || !body.end){
            return next(badRequests.NotEnParams({reqParams: 'start and end'}));
        }

        start = new Date(body.start);
        end = new Date(body.end);

        StylistPayments
            .aggregate([
                {
                    $match: {
                        $and: [
                            {date: {$gte: start}},
                            {date: {$lte: end}}
                        ]
                    }
                },
                {
                    $group: {
                        _id: '$stylist',
                        total: {$sum: '$stylistAmount'}
                    }
                }
            ], function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
    }
};

module.exports = StylistHandler;