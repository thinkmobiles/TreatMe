'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/subscriptiontype',
        idAttribute: "_id"
    });

    return Model;
});