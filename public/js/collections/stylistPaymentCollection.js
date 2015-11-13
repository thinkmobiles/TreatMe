'use strict';

define([
    'collections/parentCollection',
    'models/stylistPaymentModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        url: function () {
            return '/admin/stylistPayments';
        }
    });

    return Collection;
});