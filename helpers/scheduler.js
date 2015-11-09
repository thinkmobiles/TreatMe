var CONSTANTS = require('../constants');
var StylistHandler = require('../handlers/stylist');
var _ = require('lodash');
var mongoose = require('mongoose');
var schedule = require('node-schedule');

var SchedulerHelper = function(app, db){

    var stylistHandler = new StylistHandler(app, db);
    var Services = db.model('Service');
    var User = db.model('User');
    var io = app.get('io');
    var ObjectId = mongoose.Types.ObjectId;


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

                stylistHandler.checkStylistAvailability(availabilityObj, appointmentId, function (err, appointmentModel) {
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

                            stylistHandler.checkStylistAvailability(availabilityObj, appointmentId, function (err, appointmentModel) {
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


};


module.exports = SchedulerHelper;
