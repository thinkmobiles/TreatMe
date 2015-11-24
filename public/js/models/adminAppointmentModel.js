'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/appointments',
        idAttribute: "_id",
        validate: function (attrs, options) {
            var errors = [];
            var serviceType = attrs.serviceType;
            var bookingDate = attrs.bookingDate;
            var clientId = attrs.clientId;
            var stylistId = attrs.stylistId;

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
            if (!stylistId) {
                errors.push({name: 'stylistId', message: 'Stylist is required!'});
            }



            return (errors.length) ? errors : false;

            }


    });

    return Model;
});