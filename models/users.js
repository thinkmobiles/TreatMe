var ImageHandler = require('../handlers/image');

module.exports = function (db) {
    'use strict';
    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var CONSTANTS = require('../constants');
    var imageHandler = new ImageHandler();

    var User = new Schema({
        email: {type: String, default: null},
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        approved: {type: Boolean, default: false},
        suspend: {
            isSuspend: {type: Boolean,  default: false},
            history: [
                {
                    from: {type: Date, default: Date.now},
                    reason: {type: String, default: ''}
                }
            ]
        },
        role: {type: String, match: /^Stylist$|^Client$|^Admin$/},
        personalInfo: {
            firstName: {type: String, default: ''},
            lastName: {type: String, default: ''},
            profession: {type: String, default: ''},
            phone: {type: String, default: ''},
            facebookURL: {type: String, default: ''},
            avatar: {type: String, default: ''}
        },
        salonInfo: {
            salonName: {type: String, default: ''},
            phone: {type: String, default: ''},
            email: {type: String, default: ''},
            businessRole: {type: String, default: 'Employee'},
            address: {type: String, default: ''},
            state: {type: String, default: ''},
            zipCode: {type: String, default: ''},
            city: {type: String, default: ''},
            country: {type: String, default: ''},
            licenseNumber: {type: String, default: ''},
            availability: {
                0: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}], //Sunday
                1: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}], //Monday
                2: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}],
                3: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}],
                4: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}],
                5: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}],
                6: [{from: {type: String, default: '00:00'}, to: {type: String, default: '00:00'}}]
            }
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