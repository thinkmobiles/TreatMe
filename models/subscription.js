
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Subscription = new Schema({
        client: {
            type: ObjectId,
            ref: 'User'
        },
        subscriptionType: {
            type: ObjectId,
            ref: 'SubscriptionType'
        },
        price: Number, //for current user, maybe with discount
        purchaseDate: {
            type: Date,
            default: Date.now
        },
        expirationDate: {
            type: Date,
            default: Date.now
        }

    }, {
        collection: 'Subscriptions'
    });


    db.model('Subscription', Subscription);

};


