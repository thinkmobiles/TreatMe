'use strict';

define(['Moment'], function (moment) {
    var Model = Backbone.Model.extend({
        urlRoot : '/appointment',
        idAttribute: '_id',

        parse: function (res) {
            var dateBookind = res.bookingDate;
            var dateRequest = res.requestDate;
            var formatedDateBooking = moment(dateBookind).format('DD/MM/YY h:mm a');
            var formatedDateRequest = moment(dateRequest).format('DD/MM/YY h:mm a');

            res.bookingDate = formatedDateBooking;
            res.requestDate = formatedDateRequest;

            return res;
        }
    });

    return Model;
});