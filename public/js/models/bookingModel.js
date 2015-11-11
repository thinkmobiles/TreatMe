'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/appointment',
        idAttribute: '_id'
    });

    return Model;
});