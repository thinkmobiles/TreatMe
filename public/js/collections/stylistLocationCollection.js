'use strict';

define([], function () {
    var Collection = Backbone.Collection.extend({

        initialize: function (options) {
            var self = this;
            self.options = options || {};

            this.fetch({
                data: self.options,
                reset: true,
                success: function () {


                },
                error: function (models, xhr) {
                }
            })
        },


        url: function () {
            return '/admin/stylist/location';
        },

        parse: function (response) {
            return response;
        }
    });

    return Collection;
});