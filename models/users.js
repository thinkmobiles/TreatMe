
module.exports = function (db) {

    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var CONSTANTS = require('../constants');

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
        online: {type: Boolean, default: false},
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
                0: [{_id: false, from: '', to: ''}], //Sunday
                1: [{_id: false, from: '', to: ''}], //Monday
                2: [{_id: false, from: '', to: ''}],
                3: [{_id: false, from: '', to: ''}],
                4: [{_id: false, from: '', to: ''}],
                5: [{_id: false, from: '', to: ''}],
                6: [{_id: false, from: '', to: ''}]
            }
        },
        payments: {
            customerId: {type: String, default: null},
            recipientId: {type: String, default: null}
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

        if (user.role === CONSTANTS.USER_ROLE.CLIENT){
            delete user.salonInfo;
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