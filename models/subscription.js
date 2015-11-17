
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Subscription = new Schema({
        client: {
            id: { type: ObjectId, ref: 'User'},
            firstName: String,
            lastName: String
        },
        subscriptionType: {
            id:{ type: ObjectId, ref: 'SubscriptionType'},
            name: String
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


