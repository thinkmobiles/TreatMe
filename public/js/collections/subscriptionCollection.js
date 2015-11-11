'use strict';

define([
    'collections/parentCollection',
    'models/subscriptionModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model
    });

    return Collection;
});