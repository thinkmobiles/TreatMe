
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var Gallery = new Schema({
        clientId: String,
        stylistId: String,
        appointment: {
            type: ObjectId,
            ref: 'Appointment'
        }

    }, {
        collection: 'Gallery'
    });


    db.model('Gallery', Gallery);

};

