'use strict';


define([
    'models/stylistModel'

], function (Model) {
    var Collection = Backbone.Collection.extend({
        model:Model,

        url: function () {
            return "/admin/stylist"
        },

        initialize: function(options){
            if (options && options.status) {
                this.url = "/admin/stylist";

                this.fetch({
                    reset: true,
                    data: {status: options.status},
                    success: function(coll){
                        return coll;
                    }
                })
            }

            //this.fetch({
            //    reset: true,
            //    success: function(coll){
            //        return coll;
            //    }
            //});
        },

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
                error: this.handleErrorResponse
            })
        }
    });

    return Collection;
});