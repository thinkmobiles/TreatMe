'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/packages',
        idAttribute: "_id"
    });

    return Model;
});