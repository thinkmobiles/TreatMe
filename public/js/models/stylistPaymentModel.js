'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/stylistPayments',
        idAttribute: "_id"
    });

    return Model;
});