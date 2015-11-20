'use strict';

define([
    'collections/parentCollection',
    'models/serviceApplicationsModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        //baseUrl: '/admin/client',
        baseUrl: '/admin/services',
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