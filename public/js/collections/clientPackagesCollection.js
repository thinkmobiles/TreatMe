'use strict';

define([
    'collections/parentCollection',
    'models/clientPackagesModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({

        model: Model,

        url: function () {
            return "/admin/packages"
        }
    });

    return Collection;
});