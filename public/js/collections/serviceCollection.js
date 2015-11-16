'use strict';

define([
    'collections/parentCollection',
    'models/serviceModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        url: function () {
            return '/admin/services';
        }
    });

    return Collection;
});