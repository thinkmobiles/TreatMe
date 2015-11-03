var ImageHandler = require('../handlers/image');

module.exports = function (db) {
    'use strict';
    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var CONSTANTS = require('../constants');
    var imageHandler = new ImageHandler();

    var User = new Schema({
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        approved: {type: Boolean, default: false},
        suspend: {
            isSuspend: {type: Boolean,  default: false},
            from: {type: Date, default: Date.now}
        },
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
        },
        activeSubscriptions: [String],
        createdAt: {type: Date, default: Date.now}

    }, {
        collection: 'Users'
    });

    User.methods.toJSON = function(){
        var user = this.toObject();
        var avatarName;
        var avatarUrl;

        if (user.role === CONSTANTS.USER_ROLE.CLIENT){
            delete user.salonInfo;
        }

        if (user.personalInfo) {
            avatarName = user.personalInfo.avatar || '';
        }

        if (avatarName) {
            avatarUrl = imageHandler.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
            user.personalInfo.avatar = avatarUrl;
        }

        if (user.loc){
            user.coordinates = user.loc.coordinates;
            delete user.loc;
        }

        delete user.password;

        return user;
    };


    db.model('User', User);

};