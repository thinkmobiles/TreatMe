/**
 * @description Subscriptions management module
 * @module Subscription
 *
 */


var badRequests = require('../helpers/badRequests');
var async = require('async');
var ImageHandler = require('./image');
var CONSTANTS = require('../constants');
var _ = require('lodash');

var SubscriptionsHandler = function (db) {

    var SubscriptionType = db.model('SubscriptionType');
    var Subscription = db.model('Subscription');
    var User = db.model('User');
    var imageHandler = new ImageHandler();

    function getAllSubscriptionTypes(clientId, role, callback){
        SubscriptionType
            .find({}, {__v: 0}, function(err, subscriptionTypeModels){
                if (err){
                    return callback(err);
                }

                if (role === CONSTANTS.USER_ROLE.ADMIN){
                    subscriptionTypeModels.map(function(model){

                        if (model.logo){
                            model.logo = imageHandler.computeUrl(model.logo, CONSTANTS.BUCKET.IMAGES);
                        }

                        return model;
                    });

                    return callback(null, subscriptionTypeModels);
                }

                Subscription
                    .find({'client.id': clientId, expirationDate: {$gte: new Date()}}, function(err, subscriptionModelsArray){
                        var subscriptionIds;
                        var result;

                        if (err){
                            return callback(err);
                        }


                        subscriptionIds = (_.pluck(subscriptionModelsArray, 'subscriptionType.id')).toStringObjectIds();

                        result = subscriptionTypeModels.map(function(model){
                            var modelJSON = model.toJSON();
                            var id = modelJSON._id.toString();

                            if (modelJSON.logo){
                                modelJSON.logo = imageHandler.computeUrl(modelJSON.logo, CONSTANTS.BUCKET.IMAGES);
                            }

                            modelJSON.purchased = (subscriptionIds.indexOf(id) !== -1);

                            return modelJSON;
                        });

                        callback(null, result);
                    });
            });
    }

    function getSubscriptionTypeById(subscriptionId, clientId, role, callback){

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionId)){
            return callback(badRequests.InvalidValue({value: subscriptionId, param: 'id'}));
        }

        async.parallel({

            subscriptionType: function(cb){
                SubscriptionType
                    .findOne({_id: subscriptionId}, {__v: 0}, function(err, subscriptionModel){
                        var resultObj;

                        if (err){
                            return callback(err);
                        }

                        if(!subscriptionModel){
                            return callback(badRequests.NotFound({target: 'SubscriptionType'}));
                        }

                        resultObj = subscriptionModel.toJSON();

                        if (resultObj.logo){
                            resultObj.logo = imageHandler.computeUrl(resultObj.logo, CONSTANTS.BUCKET.IMAGES);
                        }

                        cb(null, resultObj);
                    });
            },

            ssalonsCount: function(cb){
                User.count({role : CONSTANTS.USER_ROLE.STYLIST, approved: true}, function(err, stylistCount){
                    if (err){
                        return cb(err);
                    }

                    cb(null, stylistCount);
                });
            },

            haveSubscription: function(cb){
                if (role !== CONSTANTS.USER_ROLE.CLIENT){
                    return cb(null, null);
                }

                Subscription
                    .findOne({'client.id': clientId, 'subscriptionType.id': subscriptionId, expirationDate: {$gte : new Date()}}, function(err, subscriptionModel){
                        if (err){
                            return cb(err);
                        }

                        if (!subscriptionModel){
                            return cb(null, false);
                        }

                        cb(null, true);
                    });
            }
        },

            function(err, result){
                var modelJSON;

                if (err){
                    return callback(err);
                }

                modelJSON = result.subscriptionType;
                if (role === CONSTANTS.USER_ROLE.CLIENT){
                    modelJSON.salonCount = result.ssalonsCount;
                    modelJSON.purchased = result.haveSubscription;
                }

                callback(null, modelJSON);
            });
    }

    this.getSubscriptionTypes = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/subscriptionType/:id?`__
         *
         * This __method__ allows get all subscriptions or by id, by _Admin_ or _Client_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/subscriptionType/
         *
         *   OR
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/subscriptionType/5638b946f8c11d9c0408133f
         *
         * @example Response example:
         *
         *  Response status: 200
         *  [
         *      {
         *          "_id": "5638b946f8c11d9c0408133f",
         *          "name": "Unlimited Pass",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b946f8c11d9c0408133e.png",
         *          "allowServices": [
         *              "5638ccde3624f77b33b6587d",
         *              "56387644a2e4362617283dce"
         *          ],
         *          "price": 135,
         *          "purchased": false
         *      },
         *      {
         *          "_id": "5638b965f8c11d9c04081341",
         *          "name": "Unlimited Manicure",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b965f8c11d9c04081340.png",
         *          "allowServices": [
         *              "5638ccde3624f77b33b6587d"
         *          ],
         *          "price": 49,
         *          "purchased": false
         *      },
         *      {
         *          "_id": "5638b976f8c11d9c04081343",
         *          "name": "Unlimited Blowout",
         *          "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5638b976f8c11d9c04081342.png",
         *          "allowServices": [
         *              "56387644a2e4362617283dce"
         *          ],
         *          "price": 99,
         *          "purchased": true
         *      }
         *  ]
         *
         * @method getSubscriptionTypes
         * @instance
         */

        var subscriptionId = req.params.id;
        var clientId = req.session.uId;

        if (subscriptionId){
            getSubscriptionTypeById(subscriptionId, clientId, req.session.role, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            })
        } else {
            getAllSubscriptionTypes(clientId, req.session.role, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            })
        }
    };

    this.addSubscriptionType = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/subscriptionType/`__
         *
         * This __method__ allows create subscription by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/subscriptionType/
         *
         * @example Body example:
         * {
         *  "name": "Unlimited Pass",
         *  "price": 139,
         *  "description":"Maniqure and Blowout",
         *  "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JF..." (Base64)
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {"success": "Subscription created successfully"}
         *
         * @method addSubscriptionType
         * @instance
         */

        var body = req.body;
        var subscriptionModel;
        var imageName = imageHandler.createImageName();
        var createObj;
        var allowServicesObjectId;

        if (!body.name || !body.logo || !body.price || !body.allowServices || !body.allowServices.length || !body.description) {
            return next(badRequests.NotEnParams({reqParams: 'name and logo and price and description and allowServices'}));
        }

        allowServicesObjectId = body.allowServices.toObjectId();

        createObj = {
            name: body.name,
            price: body.price,
            logo: imageName,
            description: body.description,
            allowServices: allowServicesObjectId
        };

        imageHandler.uploadImage(body.logo, imageName, CONSTANTS.BUCKET.IMAGES, function (err) {
            if (err) {
                return next(err);
            }

            subscriptionModel = new SubscriptionType(createObj);

            subscriptionModel
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }


                    res.status(200).send({success: 'Subscription created successfully'});

                });
        });
    };

    this.updateSubscriptionType = function (req, res, next) {

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/subscriptionType/:id`__
         *
         * This __method__ allows update subscription by _Admin_
         *
         * @example Request example:
         *        http://projects.thinkmobiles.com:8871/subscriptionType/56387644a2e4362617283dc1
         *
         * @example Body example:
         *
         *  {
         *      "name": "BlowOut",
         *      "price": 99,
         *      "description": "",
         *      "logo": "data:image/png;base64, /9j/4AAQSkZJRgABAQAAAQABAAD/2",
         *      "allowServices": ["56387644a2e4362617283dce"]
         *  }
         *
         * @example Response example:
         *
         * Response status: 200
         *
         * {"success": "Subscription type was updated successfully"}
         *
         *
         * @method updateSubscriptionType
         * @instance
         */

        var body = req.body;
        var subscriptionTypeId = req.params.id;
        var name = body.name;
        var price = body.price;
        var description = body.description;
        var imageString = body.logo;
        var imageName;
        var allowServices = body.allowServices;
        var updateObj = {};
        var allowServicesObjectId;
        var oldLogoName;

        if (!name && !imageString && !price && !allowServices && !allowServices.length && !description) {
            return next(badRequests.NotEnParams({reqParams: 'name or logo or price or description or allowServices'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionTypeId)) {
            return next(badRequests.InvalidValue({value: subscriptionTypeId, param: 'id'}));
        }

        if (name) {
            updateObj.name = name;
        }

        if (price) {
            updateObj.price = price;
        }

        if (description) {
            updateObj.description = description;
        }

        if (imageString) {
            imageName = imageHandler.createImageName();
            updateObj.logo = imageName;
        }

        if (allowServices) {
            allowServicesObjectId = allowServices.toObjectId();
            updateObj.allowServices = allowServicesObjectId;
        }

        async.series([

                function (cb) {
                    if (!imageString){
                        return cb(null);
                    }

                    imageHandler.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                },

                function (cb) {
                    SubscriptionType
                        .findOneAndUpdate({_id: subscriptionTypeId}, {$set: updateObj}, function (err, subscriptionTypeModel) {
                            if (err) {
                                return cb(err);
                            }

                            if (!subscriptionTypeModel) {
                                return cb(badRequests.DatabaseError());
                            }

                            oldLogoName = subscriptionTypeModel.get('logo');

                            cb();
                        });
                },

                function(cb){
                    if (!imageString || !oldLogoName){
                        return cb();
                    }

                    imageHandler.deleteImage(oldLogoName, CONSTANTS.BUCKET.IMAGES, cb);
                }

            ],

            function (err) {
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Subscription type was updated successfully'});
            }
        );
    };

    this.removeSubscriptionType = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/subscriptionType/:id`__
         *
         * This __method__ allows delete subscription by _Admin_
         *
         * @example Request example:
         *        http://projects.thinkmobiles.com:8871/subscriptionType/5638b946f8c11d9c0408133f
         *
         * @example Response example:
         *
         * Response status: 200
         *
         * {"success": "Subscription type was removed successfully"}
         *
         * @method removeSubscriptionType
         * @instance
         */


        var subscriptionTypeId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionTypeId)) {
            return next(badRequests.InvalidValue({value: subscriptionTypeId, param: 'id'}));
        }

        SubscriptionType
            .remove({_id: subscriptionTypeId}, function(err){
                if (err){
                    return next(err);
                }

                Subscription
                    .remove({'subscriptionType.id': ObjectId(subscriptionTypeId)}, function(err){
                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'Subscription type was removed successfully'});
                    });
            });
    };

};

module.exports = SubscriptionsHandler;
