
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

    this.getSubscriptionTypes = function(req, res, next){
        var clientId = req.session.uId;

        SubscriptionType
            .find({}, {__v: 0}, function(err, subscriptionModels){
            if (err){
                return next(err);
            }
            res.status(200).send(subscriptionModels);
        });
    };

    this.createSubscriptionType = function(req, res, next){
        var body = req.body;
        var subscriptionModel;
        var saveObj;

        if (!body.name || !body.price){
            return next(badRequests.NotEnParams({reqParams: 'name and price'}));
        }

        saveObj = {
            name: body.name,
            price: body.price
        };

        subscriptionModel = new SubscriptionType(saveObj);
        subscriptionModel
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
            .findOneAndUpdate({_id:subscriptionId}, updateObj, function(err, subscriptionModel){
                if (err){
                    return next(err);
                }

                if (!subscriptionModel){
                    return next(badRequests.NotFound({target: 'Subscription'}));
                }

                res.status(200).send({success: 'Subscription updated successfully'});
            });
    };

};

module.exports = SubscriptionsHandler;
