'use strict';

define([
    'collections/parentCollection',
    'models/appointmentModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model
    });

    return Collection;
});