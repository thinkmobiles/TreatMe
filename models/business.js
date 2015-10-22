
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Stylist = new Schema({
        name: String,
        avatar: String
    });

    var Business = new Schema({
        name: {type: String, default: 'Salon'},
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        salonDetails: {
            salonName: String,
            address: String,
            state: String,
            zipCode: String,
            phone: String,
            licenseNumber: String,
            logo: String,
            stylists: [Stylist]
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