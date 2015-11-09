var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var CONSTANTS = require('../constants');
var async = require('async');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var ImageHandler = require('./image');


var StylistHandler = function (app, db) {

    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');
    var Appointment = db.model('Appointment');
    var User = db.model('User');
    var imageHandler = new ImageHandler();


    this.checkStylistAvailability = function(availabilityObj, appointmentId, callback) {
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
                console.log('Appointment booked on ' + bookDay + ' day');
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

                callback(null, null);
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