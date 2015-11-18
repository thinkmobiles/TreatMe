'use strict';

define([
    'collections/parentCollection',
    'models/serviceModel'
], function (ParentCollection, Model) {
    var Collection = Backbone.Collection.extend({
        model: Model,

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
            return '/admin/services';
        },

        parse: function (response) {
            return response;
        }
    });

    return Collection;
});