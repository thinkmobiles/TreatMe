'use strict';

define([
    '/js/validator.js',
    'collections/applicationsServiceCollection',
    'models/serviceApplicationsModel',
    'text!templates/newApplications/serviceTemplate.html'
], function (validator, Collection, StylistModel, MainTemplate) {

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

            this.$el.html(this.mainTemplate({services: collection}));

            return this;
        },

        getData: function () {
            var checkboxes = this.$el.find('.checkbox:checked');
            var isValid = true;

            var dataService = _.map(checkboxes, function (checkbox) {
                var serviceContainer = $(checkbox).closest('.service');
                var id = serviceContainer.data('id');
                var price = serviceContainer.find('#price').val() || 0;
                serviceContainer.find('.prompt').html('');

                if (price == 0 || !price || !validator.isNumeric(price))  {
                    serviceContainer.find('.prompt').html('Please fill Price field or Incorrect format price');
                    isValid = false;
                }

                var obj = {
                    id: id,
                    price: price
                };

                return 'obj';
            });

            if (isValid === false) {
                return isValid;
            }

            return dataService;
        }
    });

    return View;
});
