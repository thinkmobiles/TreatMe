'use strict';

define([
    'constants/index',
    'models/clientModel'

], function (CONSTANTS, Model) {
    var Collection = Backbone.Collection.extend({
        model:Model,

        url: function () {
            return "/admin/client"
        },

        initialize: function(options){
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

        }
    });

    return Collection;
});