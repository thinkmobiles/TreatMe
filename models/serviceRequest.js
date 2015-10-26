
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var serviceRequest = new Schema({

    }, {
        collection: 'serviceRequest'
    });


    db.model('serviceRequest', serviceRequest);

};