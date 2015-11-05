'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/client',
        idAttribute: "_id"
    });

    return Model;
});