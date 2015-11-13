'use strict';

define([
    'collections/parentCollection',
    'models/clientModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        baseUrl: '/admin/subscriptions',
        url: function () {
            return this.baseUrl;
        },
        initialize: function (options) {
            if (options && options.id) {
                this.baseUrl += '/' + options.id;
            }
            ParentCollection.prototype.initialize.call(this, options);
        }
    });

    return Collection;
});