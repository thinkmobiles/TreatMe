module.exports = function (db) {
    'use strict';
    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var CONSTANTS = require('../constants');

    var User = new Schema({
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        approved: {type: Boolean, default: false},
        role: {type: String, match: /^Stylist$|^Client$|^Admin$/},
        personalInfo: {
            firstName: String,
            lastName: String,
            profession: String,
            phone: String,
            facebookURL: String,
            avatar: String
        },
        salonInfo: {
            salonName: String,
            phone: String,
            email: String,
            businessRole: {type: String, default: 'Employee'},
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
        collection: 'Users'
    });

    User.methods.toJSON = function(){
        var user = this.toObject();

        if (user.role === CONSTANTS.USER_ROLE.CLIENT){
            delete user.salonInfo;
        }

        return user;
    };



   db.model('User', User);

};