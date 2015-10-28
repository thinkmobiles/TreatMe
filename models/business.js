
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Business = new Schema({
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        approved: {type: Boolean, default: false},
        personalInfo: {
            firstName: String,
            lastName: String,
            profession: String,
            phoneNumber: String,
            facebookURL: String,
            avatar: String
        },
        salonInfo: {
            salonName: String,
            phoneNumber: String,
            email: String,
            yourBusinessRole: {type: String, default: 'Employee'},
            address: String,
            state: String,
            zipCode: String,
            city: String,
            country: String,
            licenseNumber: String
        },
        loc: {
            type: {
                type: String,
                match: /^Point$/,
                default: 'Point'
            },
            coordinates: [Number]
        }

    }, {
        collection: 'Business'
    });


    db.model('Business', Business);

};