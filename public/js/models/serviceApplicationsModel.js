'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/services',
        idAttribute: "_id"
    });

    return Model;
});