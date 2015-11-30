var badRequests = require('../helpers/badRequests');
var async = require('async');
var ImageHandler = require('./image');
var CONSTANTS = require('../constants');
var _ = require('lodash');
var StripeModule = require('../helpers/stripe');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var HooksHandler = function (db) {
    var Payments = db.model('Payment');
    var StylistPayments = db.model('StylistPayments');

    this.fireOnInvoiceHook = function(req, res, next){
        var body = req.body;
        var customerId = body.data.object.customer;
        var subscriptionId = body.data.object.subscription;
        var price = body.data.object.total;
        var currentPeriodEnd;
        var clientId;

        async
            .waterfall([
                // find Client by customerId
                function(cb){
                    User.findOne({'payments.customerId': customerId}, {_id: 1}, function(err, clientModel){

                        if (err){
                            return cb(err);
                        }

                        if (!clientModel){
                            return cb(badRequests.DatabaseError());
                        }

                        clientId = clientModel._id;

                        cb(null);

                    });
                },

                // get subscription by subscriptionId
                function(cb){
                    stripe.getSubscription(customerId, subscriptionId, function(err, subscription){

                        if (err){
                            return cb(err);
                        }

                        if (!subscription){
                            return cb(badRequests.NotFound({target: 'Subscription'}));
                        }

                        currentPeriodEnd = subscription.current_period_end * 1000;

                        cb(null, currentPeriodEnd);

                    });
                },

                // update subscription model
                function(dateOfEnd, cb){
                    Subscription
                        .findOneAndUpdate({stripeSubId: subscriptionId}, {$set: {expirationDate: new Date(dateOfEnd)}}, function(err){

                            if (err){
                                return cb(err);
                            }

                            cb(null);

                        });
                },

                // save payment in PaymentCollection
                function(cb){
                    var fee = price * 0.029 + 30;
                    var paymentModel;
                    var paymentData = {
                        paymentType: 'subscription',
                        amount: price,
                        fee: fee,
                        totalAmount: price - fee,
                        user: clientId,
                        role: 'client'
                    };

                    paymentModel = new Payments(paymentData);

                    paymentModel.save(cb);
                }

            ], function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send();

            });

    };
    this.fireOnTransferPaidHook = function(req, res, next){

        var body = req.body;
        var recipientId = body.recipient;

        //console.dir(body);

        async
            .waterfall([
                function(cb){
                    User
                        .findOne({'payments.recipientId': recipientId}, {_id: 1}, function(err, stylistModel){

                            if (err){
                                return cb(err);
                            }

                            if (!stylistModel){
                                return cb(badRequests.NotFound({target: 'Stylist not found'}));
                            }

                            cb(null, stylistModel);

                        });
                },

                function(cb){
                    cb(null);
                }
            ], function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send();

            });

    };

};

module.exports = HooksHandler;