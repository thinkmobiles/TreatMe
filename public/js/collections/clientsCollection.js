'use strict';

define([
    'collections/parentCollection',
    'models/clientModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({

        model: Model,

        url: function () {
            return "/admin/client"
        }
    });

    return Collection;
});