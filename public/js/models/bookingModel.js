'use strict';

define(['Moment'], function (moment) {
    var Model = Backbone.Model.extend({
        urlRoot : '/appointment',
        idAttribute: '_id',

        parse: function (res) {
            var date = res.bookingDate;
            var formatedDate = moment(date).format('DD/MM/YY h:mm a');

            res.bookingDate = formatedDate;
            res.requestDate = formatedDate;

            return res;
        }
    });

    return Model;
});