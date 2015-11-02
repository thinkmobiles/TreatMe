
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var async = require('async');
var ImageHandler = require('./image');
var CONSTANTS = require('../constants');

var SubscriptionsHandler = function (db) {

    var SubscriptionType = db.model('SubscriptionType');
    var User = db.model('User');

    function getSubscriptionTypes(callback){
        SubscriptionType
            .find({}, {__v: 0}, function(err, subscriptionModels){
                if (err){
                    return callback(err);
                }
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
            getSubscriptionTypes(function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            })
        }
    };

    this.createSubscriptionType = function(req, res, next){
        var body = req.body;
        var subscriptionTypeModel;
        var saveObj;

        if (!body.name || !body.price){
            return next(badRequests.NotEnParams({reqParams: 'name and price'}));
        }

        saveObj = {
            name: body.name,
            price: body.price
        };

        subscriptionTypeModel = new SubscriptionType(saveObj);
        subscriptionTypeModel
            .save(function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'New subscription created successfully'});
            })
    };

    this.updateSubscriptionType = function(req, res, next){
        var body = req.body;
        var subscriptionId = req.params.id;
        var updateObj = {};

        if (!body.name && !body.price){
            return next(badRequests.NotEnParams({reqParams: 'name or price'}));
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
        SubscriptionType
            .findOneAndUpdate({_id: subscriptionId}, updateObj, function(err, subscriptionTypeModel){
                if (err){
                    return next(err);
                }

                if (!subscriptionTypeModel){
                    return next(badRequests.NotFound({target: 'Subscription'}));
                }

                res.status(200).send({success: 'Subscription updated successfully'});
            });
    };

};

module.exports = SubscriptionsHandler;
