
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var SubscriptionType = new Schema({
        name: String,
        price: String,
        logo: String,
        allowServices: [ObjectId]
    }, {
        collection: 'SubscriptionTypes'
    });


    db.model('SubscriptionType', SubscriptionType);

};
