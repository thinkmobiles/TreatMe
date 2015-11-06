'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/stylist',
        idAttribute: "_id",

        updateCurrent: function (options) {
            options = options || {};

            options.url = '/profile' + this.id;

            return Backbone.Model.prototype.save.call(this, options);
        }
    });

    return Model;
});