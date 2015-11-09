var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var async = require('async');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var schedule = require('node-schedule');
var ImageHandler = require('./image');


var StylistHandler = function (app, db) {

    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');
    var Appointment = db.model('Appointment');
    var User = db.model('User');
    var imageHandler = new ImageHandler();
    var io = app.get('io');


    function checkStylistAvailability(availabilityObj, appointmentId, callback) {
        var resultModelJSON;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return callback(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOne({_id: appointmentId}, {client: 1, clientLoc: 1, serviceType: 1, status: 1, bookingDate: 1})
            .populate([{path: 'serviceType'}, {path: 'client', select: 'personalInfo.firstName personalInfo.lastName personalInfo.avatarName'}])
            .exec(function (err, appointmentModel) {
                var status;
                var error;
                var bookingDate;
                var bookDay;
                var bookedHoursAndMinutes;

                if (err) {
                    return callback(err);
                }

                if (!appointmentModel) {
                    return callback(badRequests.DatabaseError());
                }

                status = appointmentModel.get('status');

                if (status !== CONSTANTS.STATUSES.APPOINTMENT.CREATED) {
                    error = new Error('Appointment was accepted by somebody else');
                    error.status = 400;

                    return callback(error);
                }

                bookingDate = appointmentModel.get('bookingDate');
                bookDay = bookingDate.getDay();
                console.log('Appointment booked on ' + bookDay + 'day');
                bookedHoursAndMinutes = bookingDate.getHours() + ':' + bookingDate.getMinutes();

                if (availabilityObj && Object.keys(availabilityObj).length) {

                    for (var i = 0, len = availabilityObj[bookDay].length; i < len; i++) {
                        if (bookedHoursAndMinutes >= availabilityObj[bookDay][i].from && bookedHoursAndMinutes < availabilityObj[bookDay][i].to) {
                            resultModelJSON = appointmentModel.toJSON();
                            resultModelJSON.clientLoc = resultModelJSON.clientLoc.coordinates;
                            resultModelJSON.clientInfo = {
                                name: resultModelJSON.client.personalInfo.firstName + ' ' +resultModelJSON.client.personalInfo.lastName,
                                _id: resultModelJSON.client._id.toString()
                            };
                            if (resultModelJSON.client.personalInfo.avatar){
                                resultModelJSON.clientInfo.avatar = imageHandler.computeUrl(resultModelJSON.client.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                            }
                            resultModelJSON.service = {
                                _id: resultModelJSON.serviceType._id.toString(),
                                name: resultModelJSON.serviceType.name
                            };
                            if (resultModelJSON.serviceType.logo){
                                resultModelJSON.service.logo = imageHandler.computeUrl(resultModelJSON.serviceType.logo, CONSTANTS.BUCKET.IMAGES);
                            }
                            resultModelJSON._id = resultModelJSON._id.toString();

                            delete resultModelJSON.client;
                            delete resultModelJSON.serviceType;

                            return callback(null, resultModelJSON);
                        }
                    }
                }

                callback(null, false);
            });
    }

    this.startLookStylistForAppointment = function (appointmentId, userCoordinates, serviceTypeId) {

        var foundedStylists = [];
        var tenStylistsModelArray = [];
        var goodStylistModel;
        var stylistId;
        var room;
        var distance = CONSTANTS.SEARCH_DISTANCE.START;
        var maxDistance = CONSTANTS.SEARCH_DISTANCE.MAX;

        var newScheduler = schedule.scheduleJob('*/30 * * * * *', function () {
            var availabilityObj;

            console.log('>>> Scheduler starts for appointment id: ' + appointmentId + ' and distance: ' + distance / 1609.344 + ' miles');

            if (distance > maxDistance) {
                console.log('>>>Scheduler canceled');
                newScheduler.cancel();

                return;
            }

            if (tenStylistsModelArray.length) {
                goodStylistModel = tenStylistsModelArray.shift();

                if (!goodStylistModel) {
                    return distance += 1609.344;
                }

                stylistId = goodStylistModel.get('_id');
                availabilityObj = goodStylistModel.get('salonInfo.availability');

                console.log('>>>Found stylist with id: ' + stylistId);

                checkStylistAvailability(availabilityObj, appointmentId, function (err, appointmentModel) {
                    if (err) {
                        if (err.message.indexOf('was accepted') !== -1) {
                            console.log('>>>Scheduler canceled');
                            newScheduler.cancel();
                            return;
                        }

                        return console.log(err);
                    }

                    if (appointmentModel) {
                        room = stylistId.toString();

                        io.to(room).send('new appointment', appointmentModel);
                        return console.log('Sent appointment to stylist with id: ' + stylistId);
                    }
                })
            }

            User
                .find(
                {
                    role: CONSTANTS.USER_ROLE.STYLIST,
                    online: true,
                    'suspend.isSuspend': false,
                    loc: {
                        $geoWithin: {
                            $centerSphere: [userCoordinates, distance / 6378137]
                        }
                    },
                    _id: {$nin: foundedStylists}
                })
                .limit(10)
                .exec(function (err, stylistModelsArray) {
                    var stylistIdsArray;

                    if (err) {
                        return console.log(err);
                    }

                    stylistIdsArray = _.pluck(stylistModelsArray, '_id');
                    foundedStylists = foundedStylists.concat(stylistIdsArray);

                    Services
                        .find({
                            stylist: {$in: stylistIdsArray},
                            serviceId: ObjectId(serviceTypeId),
                            approved: true
                        }, {stylist: 1, price: 1})
                        .sort({price: -1})
                        .limit(10)
                        .exec(function (err, serviceModelArray) {
                            var stylistWithServices;
                            var stylistModelsStringIdsArray;

                            if (err) {
                                return console.log(err);
                            }

                            console.log(serviceModelArray);

                            if (serviceModelArray.length) {
                                stylistWithServices = _.pluck(serviceModelArray, 'stylist');
                                stylistWithServices = stylistWithServices.toStringObjectIds();

                                stylistModelsStringIdsArray = stylistIdsArray.toStringObjectIds();

                                tenStylistsModelArray = stylistWithServices.map(function (id) {
                                    var index = stylistModelsStringIdsArray.indexOf(id);

                                    if (index !== -1) {
                                        return stylistModelsArray[index];
                                    }
                                });

                                if (tenStylistsModelArray.length) {
                                    goodStylistModel = tenStylistsModelArray.shift();

                                    stylistId = goodStylistModel.get('_id');
                                    availabilityObj = goodStylistModel.get('salonInfo.availability');

                                    console.log('>>>Found stylist with id: ' + stylistId);
                                }
                            } else {
                                availabilityObj = {};
                            }

                            checkStylistAvailability(availabilityObj, appointmentId, function (err, appointmentModel) {
                                if (err) {
                                    if (err.message.indexOf('was accepted') !== -1) {
                                        console.log('>>>Scheduler canceled');
                                        newScheduler.cancel();
                                        return;
                                    }

                                    return console.log(err);
                                }

                                if (appointmentModel) {
                                    room = stylistId.toString();

                                    io.to(room).send('new appointment', appointmentModel);
                                    console.log('Sent appointment to stylist with id: ' + stylistId);
                                }

                                if (!tenStylistsModelArray.length) {
                                    return distance += 1609.344;
                                }

                            })

                        });
                })
        });

        newScheduler.invoke();
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
                stylist: stylistId
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

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            stylist: ObjectId(stylistId),
            status: CONSTANTS.STATUSES.APPOINTMENT.CONFIRMED

        };

        Appointment
            .findOne({_id: appointmentId}, function (err, appointmentModel) {
                if (err) {
                    return next(err);
                }

                if (!appointmentModel) {
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                if (appointmentModel.stylist || appointmentModel.status !== CONSTANTS.STATUSES.APPOINTMENT.CREATED) {
                    var error = new Error('Somebody accepted appointment earlier then you');

                    error.status = 400;

                    return next(error);
                }

                appointmentModel
                    .update({$set: updateObj}, function (err) {
                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: 'Appointment accepted successfully'});
                    });
            });
    };

    this.finishAppointmentById = function (req, res, next) {
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)) {
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            endDate: new Date(),
            status: CONSTANTS.STATUSES.APPOINTMENT.SUCCEEDED

        };

        Appointment
            .findOneAndUpdate({
                _id: appointmentId,
                stylist: stylistId
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

                        res.status(200).send({success: 'Your online status changed successfully'});
                    });
            });
    };
};

module.exports = StylistHandler;