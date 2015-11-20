var badRequests = require('../helpers/badRequests');

var StripeModule = function(){
    var stripe = require('stripe')('sk_test_qm4XWhCRhgwoVERsZt21TK8T');

    this.createCustomer = function (data, callback){


        if (!data || (typeof data !== 'object')) {

            if (callback && (typeof callback === 'function')) {
                return callback(badRequests.NotEnParams());
            }
        }

        stripe
            .customers
            .create(data, function(err, customer){

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    return callback(err);
                }
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, customer);
            }
        });
    };

    this.deleteCustomer = function(customerId, callback){

        if (!callback && typeof customerId == 'function'){
            callback = customerId;
            return callback(badRequests.NotEnParams({reqParams: 'customerId'}));
        }

        stripe
            .customers
            .del(customerId, function(err){

                if (err){
                    return callback(err);
                }

                callback(null);

            });
    };

    this.addCard = function(customerId, data, callback){

        if (!data || (typeof data !== 'object')){

            if (callback && (typeof callback === 'function')) {
                return callback(badRequests.NotEnParams());
            }
        }

        if (!data.source){
            if (callback && (typeof callback === 'function')) {
                return callback(badRequests.NotEnParams({reqParams: 'source'}));
            }

        }

        stripe
            .customers
            .createSource(customerId, data, function(err, card){

                if (err){
                    return callback(err);
                }

                callback(null, card);

            });
    };

    this.getCustomerCards = function(customerId, callback){

        if(!callback && typeof customerId === 'function'){
            return callback(badRequests.NotEnParams({reqParams: 'customerId'}));
        }

        stripe
            .customers
            .listCards(customerId, function(err, resultCards){

            if (err){
                return callback(err);
            }

            callback(null, resultCards);

        });

    };

    this.updateCustomerCard = function(customerId, cardId, data, callback){

        stripe
            .customers
            .updateCard(customerId, cardId, data, function(err, card){
                if (err){
                    return callback(err);
                }

                callback(null, card);
            });
    };

    this.removeCustomerCard = function(customerId, cardId, callback){

        stripe
            .customers
            .deleteCard(customerId, cardId, function(err, confirmation){

                if (err){
                    return callback(err);
                }

                callback(null, confirmation);

            });

    };

    this.createRecipient = function(data, callback){

        stripe.recipients.create(data, function(err, recipient){
            if (err){
                return callback(err);
            }

            callback(null, recipient);
        })

    }

};

module.exports = StripeModule;

