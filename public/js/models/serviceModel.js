'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/services/requested',
        idAttribute: "_id"
    });

    return Model;
});