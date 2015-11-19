'use strict';

define([
    'collections/applicationsServiceCollection',
    'models/serviceApplicationsModel',
    'text!templates/newApplications/serviceTemplate.html'
], function ( Collection, StylistModel, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#serviceApplications',

        Collection: Collection,
        mainTemplate: _.template(MainTemplate),

        events: {
        },

        initialize: function (options) {
            var collection = new Collection();

            collection.on('reset', this.render, this);

            this.collection = collection;
        },

        render: function () {
            var collection = this.collection.toJSON();
            console.log(collection);

            this.$el.html(this.mainTemplate({services: collection}));

            return this;
        },

        getServiceData: function () {
            var thisEl = this.$el.find('.checkbox:checked');
            var dataService = _.map(thisEl, function (checkbox) {
                return $(checkbox).closest('').data({})
            });

            return dataService;
        }
    });

    return View;
});
