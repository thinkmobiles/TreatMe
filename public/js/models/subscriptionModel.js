'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/subscriptions',
        idAttribute: "_id"
    });

    return Model;
});