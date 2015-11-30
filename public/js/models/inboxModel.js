'use strict';

define(['Moment'], function (moment) {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/inbox',
        idAttribute: "_id",

        parse: function (res) {
            var createdAt = res.createdAt;
            var formatedCreatedAt = moment(createdAt).format('DD/MM/YY h:mm a');

            res.createdAt = formatedCreatedAt;

            return res;
        }
    });

    return Model;
});