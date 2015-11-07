'use strict';

define([
    //'constants/index',
    'collections/parentCollection',
    'models/stylistModel'
], function (/*CONSTANTS,*/ParentCollection, Model) {
    var Collection = ParentCollection.extend({

        model: Model,

        url: function () {
            return "/admin/stylist"
        },

        initialize: function (options) {
            var page;

            options = options || {};
            page = options.page;
            options.reset = true;

            this.getPage(page, options);
        },

        /*initialize: function(options){
            var params = {
                reset: true,
                success: function(coll){
                    return coll;
                }
            };
            var status = (options && options.status) ? options.status : null;
            var page = (options && options.page) ? options.page : 1;
            var limit = (options && options.count) ? options.status : CONSTANTS.ITEMS_PER_PAGE;
            var data = {
                page: page,
                limit: limit
            };

            if (status) {
               data.status = status;
            }

            params.data = data;

            this.fetch(params);
        },*/

        approve: function (data, callback) {
            $.ajax({
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                url: '/admin/stylist/approve',
                data: data,
                success: callback,
                error: this.handleErrorResponse
            })
        },

        deleteRequest: function (data, callback) {
            $.ajax({
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                url: '/admin/stylist',
                data: data,
                success: callback,
                error: this.handleErrorResponse //TODO
            })
        }
    });

    return Collection;
});