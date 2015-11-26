'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/client/appointment',
        idAttribute: "_id",
        validate: function (attrs, options) {
            var errors = [];
            var serviceType = attrs.serviceType;
            var bookingDate = attrs.bookingDate;
            var clientId = attrs.clientId;
            var location = attrs.location;

            console.log(attrs);


            /* --- serviceType --- */
            if (!serviceType) {
                errors.push({name: 'serviceType', message: 'Service is required!'});
            }

            /* --- clientId --- */
            if (!bookingDate) {
                errors.push({name: 'bookingDate', message: 'Date and Time is required!'});
            }

            /* --- clientId --- */
            if (!clientId) {
                errors.push({name: 'clientId', message: 'Client is required!'});
            }

            /* --- location --- */
            if (!location) {
                errors.push({name: 'location', message: 'Location is required!'});
            }



            return (errors.length) ? errors : false;

            }


    });

    return Model;
});