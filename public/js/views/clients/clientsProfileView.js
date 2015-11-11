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

            App.Breadcrumbs.reset([{name: 'Client profile', path: '#profile'}]);
            if (options && options.id) {

                model = new Model({_id: options.id});
                model.fetch({
                    success: function (userModel) {
                        self.model = userModel;
                       // self.render();
                    },
                    error: self.handleModelError
                });
            } else {
                model = new Model();
                this.model = model;
                this.render();
            }
            this.render();

            this.clientsAppointment = new ClientsAppointment({item: model});

            this.clientsPurchased = new ClientsPurchased({item: model});

        },

        render: function () {
           // var model = this.model.toJSON();

            this.$el.html(this.template({item: {}}));

            return this;
        }
    });

    return View;
});