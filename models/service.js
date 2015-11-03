
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Service = new Schema({
        stylist: {
            type: ObjectId,
            ref: 'User'
        },
        serviceId: String,
        price: Number,
        approved: {
            type: Boolean,
            default: false
        }

    }, {
        collection: 'Services'
    });


    db.model('Service', Service);

};

