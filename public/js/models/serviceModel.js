'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/service',
        idAttribute: "_id"
    });

    return Model;
});