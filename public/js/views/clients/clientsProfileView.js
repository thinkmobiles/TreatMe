'use strict';

define([
    'models/clientModel',
    'views/clients/clientsAppointmentView',
    'views/clients/clientsPurchasedView',
    'collections/clientsCollection',
    'text!/templates/clients/clientsProfileTemplate.html'
], function (Model, ClientsAppointment, ClientsPurchased, Collection, ClientProfile) {
    var View = Backbone.View.extend({
        el: '#wrapper',

        template: _.template(ClientProfile),

        events: {
        },

        initialize: function (options) {
            var self = this;
            var model;
            console.log(options);

            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {name: 'Client profile', path: '#profile'}]);
            if (options && options.id) {

                model = new Model({_id: options.id});
                model.fetch({
                    success: function (userModel) {
                        self.model = userModel;
                        self.renderClient();
                    },
                    error: self.handleModelError
                });
            } else {
                model = new Model();
                this.model = model;
                this.render();
            }
            this.render();

            this.clientsAppointment = new ClientsAppointment({id: options.id});

            this.clientsPurchased = new ClientsPurchased({id: options.id});

        },

        render: function () {
            this.$el.html(this.template());
            return this;
        },

        renderClient: function () {
            var container = this.$el.find('.accountInfo');
            var model = this.model;
            var item = model.toJSON();

            this.$el.find('.clientName').html(item.name);

            if (item.currentPackages[0]) {
                this.$el.find('#currentPackage .purchaseDate').html(item.currentPackages[0].purchaseDate);
                this.$el.find('#currentPackage .package').html(item.currentPackages[0].package);
                this.$el.find('#currentPackage .price').html(item.currentPackages[0].price);
            }

            container.find('.name').html(item.name);
            container.find('.phone').html(item.phone);
            container.find('.email').html(item.email);
        }
    });

    return View;
});