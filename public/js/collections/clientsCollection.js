'use strict';

define([
    'collections/parentCollection',
    'models/clientModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({

        model: Model,

        url: function () {
            return "/admin/client"
        },

        suspendRequest: function (options) {
            var opts = options || {};
            var ids;
            var data;

            if (opts.data) {
                data = opts.data;
            } else {
                ids = this.pluck('id');
                data = JSON.stringify({ids: ids});
            }

            $.ajax({
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                url: '/admin/suspend',
                data: data,
                success: opts.success,
                error: opts.error
            });
        }
    });

    return Collection;
});