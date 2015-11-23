var CONSTANTS = require('../constants');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var Inbox = new Schema({
        name: String,
        email: String,
        subject: String,
        message: String,
        createdAt: {type: Date, default: Date.now}
    }, {
        collection: 'Inbox'
    });


    db.model('Inbox', Inbox);

};


