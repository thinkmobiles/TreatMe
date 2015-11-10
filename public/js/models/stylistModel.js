'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/stylist',
        idAttribute: "_id",

        updateCurrent: function (options, callbackObj) {
            options = options || {};

            options.url = '/profile' + this.id;

            return Backbone.Model.prototype.save.call(this, options, callbackObj);
        }
    });

    return Model;
});