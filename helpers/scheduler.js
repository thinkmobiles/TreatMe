var CONSTANTS = require('../constants');
var StylistHandler = require('../handlers/stylist');
var _ = require('lodash');
var mongoose = require('mongoose');
var schedule = require('node-schedule');

var SchedulerHelper = function(app, db){

    var stylistHandler = new StylistHandler(app, db);
    var Services = db.model('Service');
    var User = db.model('User');
    var Payments = db.model('Payment');
    var StylistPayments = db.model('StylistPayments');
    var io = app.get('io');
    var ObjectId = mongoose.Types.ObjectId;

    function cancelShedulerAndSocketInform(scheduler, appointmentId, arrayOfRooms) {
        var room;

        for (var i = arrayOfRooms.length; i>0; i--){
            room = arrayOfRooms[i - 1];

            console.log('=> Appointment was accepted by stylist. Send socket event to room: ' + room);

            io.to(room).emit('remove appointment from map', {appointmentId: appointmentId});
        }

        console.log('>>> Scheduler canceled');

        scheduler.cancel();
    }

    function getStylistsPaymentsByPeriod (starDate, endDate, callback){
        var start = new Date(starDate);
        var end = new Date(endDate);

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
                    return callback(err);
                }

                callback(null, result);
            });
    }

    this.startLookStylistForAppointment = function (appointmentId, userCoordinates, serviceTypeId) {

        var foundedStylists = [];
        var sendedStylists = [];
        var tenStylistsModelArray = [];
        var goodStylistModel;
        var stylistId;
        var room;
        var distance = CONSTANTS.SEARCH_DISTANCE.START;
        var maxDistance = CONSTANTS.SEARCH_DISTANCE.MAX;
        var currentDate = new Date();
        var currentSeconds = currentDate.getSeconds();

        var newScheduler = schedule.scheduleJob('*/30 * * * * *', function () {
            var availabilityObj;

            console.log('>>> Scheduler starts for appointment id: ' + appointmentId + ' and distance: ' + distance / 1609.344 + ' miles');

            if (distance > maxDistance) {
                cancelShedulerAndSocketInform(newScheduler, appointmentId, sendedStylists);

                return;
            }

            if (tenStylistsModelArray.length) {
                goodStylistModel = tenStylistsModelArray.shift();

                stylistId = goodStylistModel.get('_id');
                availabilityObj = goodStylistModel.get('salonInfo.availability');

                console.log('Found stylist with id: ' + stylistId);

                stylistHandler.checkStylistAvailability(availabilityObj, stylistId, appointmentId, function (err, appointmentModel) {
                    if (err) {
                        if (err.message.indexOf('was accepted') !== -1) {
                            cancelShedulerAndSocketInform(newScheduler, appointmentId, sendedStylists);
                            return;
                        }

                        return console.log(err);
                    }

                    if (appointmentModel) {
                        room = stylistId.toString();

                        sendedStylists.push(room);

                        io.to(room).emit('new appointment', appointmentModel);
                        return console.log('==> Sent appointment to stylist with id: ' + stylistId);
                    }
                })
            } else {

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
                        /*loc: {
                            $near: {
                                $geometry: {type: 'Point', coordinates :userCoordinates}, $maxDistance : distance
                            }
                        },*/
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
                            .sort({price: 1})
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

                                        console.log('Found stylist with id: ' + stylistId);
                                    }
                                } else {
                                    availabilityObj = {};
                                }

                                stylistHandler.checkStylistAvailability(availabilityObj, stylistId, appointmentId, function (err, appointmentModel) {
                                    if (err) {
                                        if (err.message.indexOf('was accepted') !== -1) {
                                            cancelShedulerAndSocketInform(newScheduler, appointmentId, sendedStylists);
                                            return;
                                        }

                                        return console.log(err);
                                    }

                                    if (appointmentModel) {
                                        room = stylistId.toString();

                                        sendedStylists.push(room);

                                        io.to(room).emit('new appointment', appointmentModel);
                                        console.log('==> Sent appointment to stylist with id: ' + stylistId);
                                    }

                                    if (!tenStylistsModelArray.length) {
                                        return distance += CONSTANTS.SEARCH_DISTANCE.STEP;
                                    }

                                })

                            });
                    })
            }
        });

        //prevent double job invocation
        if ((currentSeconds >= 1 && currentSeconds <= 20) || (currentSeconds >= 31 && currentSeconds <= 50)){
            console.log('Invoked in : ' + currentSeconds);
            newScheduler.invoke();
        }
    };


};


module.exports = SchedulerHelper;
