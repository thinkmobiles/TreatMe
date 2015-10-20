
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var User = new Schema({
        name: String,
        email: String,
        password: String,
        token: String,
        forgotToken: String,
        fbId: {type: String, default: null},
        userType: {type: String, default: 'Business', match: /^Business$|^Client$/},
        confirmed: {type: Date}

    }, {
        collection: 'Users'
    });


    db.model('User', User);

};