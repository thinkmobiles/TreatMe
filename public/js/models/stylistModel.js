'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/stylist',
        idAttribute: "_id"
    });

    return Model;
});