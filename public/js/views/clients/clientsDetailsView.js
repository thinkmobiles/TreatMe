'use strict';

define([
    'custom',
    'models/clientModel',
    'views/clients/clientsAppointmentView',
    'views/clients/clientsPurchasedView',
    'collections/clientsCollection',
    'text!/templates/clients/clientsDetailsProfileTemplate.html',
    'text!/templates/clients/clientsProfileTemplate.html'
], function (custom, Model, ClientsAppointmentView, ClientsPurchasedView, Collection, ProfileTemplate, ClientProfile) {
    var View = Backbone.View.extend({
        el: '#wrapper',

        template: _.template(ClientProfile),
        profileTemplate: _.template(ProfileTemplate),

        events: {
            'click #editBtn': 'editProfile'
        },

        initialize: function (options) {
            var navContainer = $('.sidebar-menu');
            var self = this;
            var model;

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_clients').addClass('active');

            model = new Model({_id: options.id});
            model.fetch({
                success: function (userModel) {
                    var personalInfo = userModel.get('personalInfo');

                    self.model = userModel;
                    App.Breadcrumbs.reset([{
                        name: 'Clients List', path: '#clients'}, {
                        name: personalInfo.firstName + ' ' + personalInfo.lastName,
                        path: '#clients/:id'
                    }]);
                    self.renderClient();
                },
                error  : self.handleModelError
            });

            this.render();
            this.clientsAppointment = new ClientsAppointmentView({id: options.id});
            this.clientsPurchased = new ClientsPurchasedView({id: options.id});
        },

        editProfile: function () {
            var id = this.model.id;
            Backbone.history.navigate('clients/' + id + '/edit', {trigger: true});
        },

        render: function () {
            this.$el.html(this.template());
            return this;
        },

        renderClient: function () {
            var model = this.model;
            var $el = this.$el;
            var client = model.toJSON();

            $el.find('.clientName').html(client.name);
            $el.find('.clientForm').html(this.profileTemplate(client));

            if (client.currentSubscriptions && client.currentSubscriptions.length) {
                $el.find('#currentPackage .purchaseDate').html(client.currentSubscriptions[0].purchaseDate);
                $el.find('#currentPackage .package').html(client.currentSubscriptions[0].package);
                $el.find('#currentPackage .price').html(client.currentSubscriptions[0].price);
            }
        }

    });

    return View;
});