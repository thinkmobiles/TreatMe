'use strict';

define([
    'collections/parentCollection',
    'models/packagesModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        url: function () {
            return '/subscriptiontype';
        }
    });

    return Collection;
});