var async = require('async');

var DbHandler = function (db) {

    'use strict';

    var Business = db.model('Business');
    var Client = db.model('Client');
    //var Image = db.model('Image');

    this.dropCollections = function(callback){
        async.waterfall([

                function (cb) {
                    Business.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                },

                function (cb) {
                    Client.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                }

                /*function (cb) {
                    Image.remove({}, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    })
                }*/
            ],
            function (err) {
                if (err) {
                    return callback(err);
                }
                console.log('>>>Drop database successfully\n');
                console.log('============================================\n');
                console.log();
                callback();
            });
    }
};

module.exports = DbHandler;

