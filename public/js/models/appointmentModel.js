'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/apointment',
        idAttribute: "_id"
    });

    return Model;
});