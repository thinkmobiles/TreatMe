
var badRequests = require('../helpers/badRequests');
var async = require('async');
var ImageHandler = require('./image');
var CONSTANTS = require('../constants');

var SubscriptionsHandler = function (db) {

    var SubscriptionType = db.model('SubscriptionType');
    var User = db.model('User');
    var imageHandler = new ImageHandler();

    function getAllSubscriptionTypes(callback){
        SubscriptionType
            .find({}, {__v: 0}, function(err, subscriptionModels){
                if (err){
                    return callback(err);
                }

                subscriptionModels.map(function(model){

                    if (model.logo){
                        model.logo = imageHandler.computeUrl(model.logo, CONSTANTS.BUCKET.IMAGES);
                    }

                    return model;
                });

                callback(null, subscriptionModels);
            });
    }

    function getSubscriptionTypeById(subscriptionId, callback){

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionId)){
            return callback(badRequests.InvalidValue({value: subscriptionId, param: 'id'}));
        }

        SubscriptionType
            .findOne({_id: subscriptionId}, {__v: 0}, function(err, subscriptionModel){
                var resultObj;

                if (err){
                    return callback(err);
                }

                if(!subscriptionModel){
                    return callback(badRequests.DatabaseError());
                }

                resultObj = subscriptionModel.toJSON();
                resultObj.logo = imageHandler.computeUrl(resultObj.logo, CONSTANTS.BUCKET.IMAGES);

                User.count({role : CONSTANTS.USER_ROLE.STYLIST}, function(err, stylistCount){
                    if (err){
                        return callback(err);
                    }

                    resultObj.salonsCount = stylistCount;

                    callback(null, resultObj);
                });
            })
    }

    this.getSubscriptionTypes = function(req, res, next){
        var subscriptionId = req.params.id;

        if (subscriptionId){
            getSubscriptionTypeById(subscriptionId, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            })
        } else {
            getAllSubscriptionTypes(function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            })
        }
    };

    /*this.createSubscriptionType = function(req, res, next){
        var body = req.body;
        var subscriptionTypeModel;
        var saveObj;
        var logoName = imageHandler.createImageName();
        var imageString;

        if (!body.name || !body.price || !body.image){
            return next(badRequests.NotEnParams({reqParams: 'name and price and image'}));
        }

        imageString = body.image;

        saveObj = {
            name: body.name,
            price: body.price,
            logo: logoName
        };

        imageHandler.uploadImage(imageString, logoName, CONSTANTS.BUCKET.IMAGES, function(err){
            if (err){
                return next(err);
            }

            subscriptionTypeModel = new SubscriptionType(saveObj);
            subscriptionTypeModel
                .save(function(err){
                    if (err){
                        return next(err);
                    }

                    res.status(200).send({success: 'New subscription created successfully'});
                })
        });
    };*/

    /*this.updateSubscriptionType = function(req, res, next){
        var body = req.body;
        var subscriptionId = req.params.id;
        var updateObj = {};
        var newLogoName;

        if (!body.name && !body.price && !body.image){
            return next(badRequests.NotEnParams({reqParams: 'name or price or image'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionId)){
            return next(badRequests.InvalidValue({value: subscriptionId, param: 'id'}));
        }

        if (body.name){
            updateObj.name = body.name;
        }

        if (body.price){
            updateObj.price = body.price;
        }

        if (body.image){
            newLogoName = imageHandler.createImageName();
            updateObj.logo = newLogoName;
        }

        async.waterfall([

            function(cb){
                SubscriptionType
                    .findOneAndUpdate({_id: subscriptionId}, {$set: updateObj}, function(err, subscriptionTypeModel){
                        if (err){
                            return cb(err);
                        }

                        if (!subscriptionTypeModel){
                            return cb(badRequests.NotFound({target: 'Subscription'}));
                        }

                        cb(null, subscriptionTypeModel);
                    });
            },

            function(subscriptionTypeModel, cb){
                if (!newLogoName){
                    return cb(null, null);
                }

                var oldLogoName = subscriptionTypeModel.get('logo');

                imageHandler.uploadImage(body.image, newLogoName, CONSTANTS.BUCKET.IMAGES, function(err){
                    if (err){
                        return cb(err);
                    }

                    cb(null, oldLogoName);
                })
            },

            function(oldLogoName, cb){
                if (!oldLogoName){
                    return cb()
                }

                imageHandler.deleteImage(oldLogoName, CONSTANTS.BUCKET.IMAGES, function(err){
                    if (err){
                        return cb(err);
                    }

                    cb();
                })
            }

        ], function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Subscription updated successfully'});
        });
    };*/

};

module.exports = SubscriptionsHandler;
