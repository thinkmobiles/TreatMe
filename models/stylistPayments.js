
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var StylistPayments = new Schema({
        paymentType: {type: String, match: /^service$|^tip$/},
        realAmount: {type: Number, default: 0},
        stylistAmount: {type: Number, default: 0},
        stylist: {type: ObjectId, ref: 'User'},
        date: {type: Date, default: Date.now}
    }, {
        collection: 'StylistPayments'
    });


    db.model('StylistPayments', StylistPayments);

};
