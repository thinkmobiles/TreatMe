/**
 * Created by migal on 25.11.15.
 */
var CONSTANTS = require('../constants');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Payment = new Schema({
        paymentType: {type: String, match: /^oneTime$|^subscription$|^tip$|^salary$/},
        amount: {type: Number, default: 0},
        fee: {type: Number, default: 0},
        totalAmount: {type: Number, default: 0},
        user: {type: ObjectId, ref: 'User'},
        role: {type: String, match: /^client$|^stylist$/},
        date: {type: Date, default: Date.now}
    }, {
        collection: 'Payments'
    });


    db.model('Payment', Payment);

};
