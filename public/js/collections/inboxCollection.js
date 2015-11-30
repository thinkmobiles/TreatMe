'use strict';

define([
    'collections/parentCollection',
    'models/inboxModel'
], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        url: function () {
            return '/admin/inbox';
        }
    });

    return Collection;
});