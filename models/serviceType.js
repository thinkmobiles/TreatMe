
module.exports = function (db) {
    'use strict';

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var ServiceType = new Schema({
        name: String,
        logo: String

    }, {
        collection: 'ServiceTypes'
    });


    db.model('ServiceType', ServiceType);

};
