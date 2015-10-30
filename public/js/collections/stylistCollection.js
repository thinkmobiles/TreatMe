'use strict';


define([
    'models/stylistModel'

], function (Model) {
    var Collection = Backbone.Collection.extend({
        model:Model,

        url: function () {
            return "/admin/stylist"
        },

        initialize: function(){
            this.fetch({
                reset: true,
                success: function(coll){
                }
            });
        }
    });

    return Collection;
});