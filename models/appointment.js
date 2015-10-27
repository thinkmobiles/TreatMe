var CONSTANTS = require('../constants');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Appointment = new Schema({
        client: {
            type: ObjectId,
            ref: 'Client'
        },
        clientLoc: {
            type: {
                type: String,
                match: /^Point$/,
                default: 'Point'
            },
            coordinates: [Number]
        },
        serviceType: {
            type: ObjectId,
            ref: 'ServiceType'
        },
        requestDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            defualt: CONSTANTS.STATUSES.APPOINTMENT.CREATED
        },
        cancellationReason: String,
        stylist: {
            type: ObjectId,
            ref: 'Business'
        },
        bookingDate: Date

    }, {
        collection: 'Appointments'
    });


    db.model('Appointment', Appointment);

};

