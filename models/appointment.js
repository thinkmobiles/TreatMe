var CONSTANTS = require('../constants');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Appointment = new Schema({
        client: {
            id: {type: ObjectId, ref: 'User'},
            firstName: String,
            lastName: String

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
            id: {type: ObjectId, ref: 'ServiceType'},
            name: String
        },
        requestDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            default: CONSTANTS.STATUSES.APPOINTMENT.CREATED
        },
        startDate: Date,
        endDate: Date,
        cancellationReason: String,
        rate: Number,
        rateComment: String,
        stylist: {
            id : {type: ObjectId, ref: 'User'},
            firstName: String,
            lastName: String
        },
        bookingDate: Date,
        oneTimeService: {type: Boolean, default: true},
        price: Number,
        tip: {type: Number, default: 0}

    }, {
        collection: 'Appointments'
    });


    db.model('Appointment', Appointment);

};

