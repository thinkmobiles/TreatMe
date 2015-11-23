
var CONSTANTS = require('../constants');

module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Gallery = new Schema({
        client: {type: ObjectId, ref: 'User'},
        stylist: {type: ObjectId, ref: 'User'},
        serviceType: {type: ObjectId, ref: 'ServiceType'},
        bookingDate: {type: Date, default: Date.now},
        status: {type: String, default: CONSTANTS.STATUSES.GALLERY.PENDING}
    }, {
        collection: 'Gallery'
    });


    db.model('Gallery', Gallery);

};

