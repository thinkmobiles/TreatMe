'use strict';

define([
    'collections/parentCollection',
    'models/bookingModel'
], function (ParentCollection, Model) {

    var Collection = ParentCollection.extend({
        model: Model,
        url: function () {
            return '/appointment'
        }
    });

    return Collection;
});