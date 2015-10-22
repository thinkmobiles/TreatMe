
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Client = new Schema({
        name: {type: String, default: 'Client'},
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        confirmed: {type: Date},
        phone: String,
        avatar: String,
        loc: {
            type: {
                type: String,
                match: /^Point$/,
                default: 'Point'
            },
            coordinates: [Number]
        }

    }, {
        collection: 'Clients'
    });


    db.model('Client', Client);

};
