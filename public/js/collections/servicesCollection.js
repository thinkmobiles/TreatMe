'use strict';

define([
    'collections/parentCollection',
    'models/serviceModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model
    });

    return Collection;
});