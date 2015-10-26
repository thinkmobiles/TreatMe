
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var SubscriptionType = new Schema({
        name: String,
        price: String
    }, {
        collection: 'SubscriptionTypes'
    });


    db.model('SubscriptionType', SubscriptionType);

};
