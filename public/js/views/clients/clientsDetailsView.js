'use strict';

define([
    'custom',
    'models/clientModel',
    'views/clients/clientsAppointmentView',
    'views/clients/clientsPurchasedView',
    'collections/clientsCollection',
    'text!/templates/clients/clientsProfileTemplate.html'
], function (custom, Model, ClientsAppointmentView, ClientsPurchasedView, Collection, ClientProfile) {
    var View = Backbone.View.extend({
        el: '#wrapper',

        template: _.template(ClientProfile),

        events: {
            'click #editBtn': 'editProfile'
        },

        initialize: function (options) {
            var navContainer = $('.sidebar-menu');
            var self = this;
            var model;

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_clients').addClass('active');

            if (options && options.id) {

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

            } else {
                model = new Model();
                this.model = model;
                this.render();
            }

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
            var container = $el.find('.stylistForm');
            var item = model.toJSON();
            var personalInfo = item.personalInfo;

            $el.find('.clientName').html(item.name);

            if (item.currentSubscriptions[0]) {
                $el.find('#currentPackage .purchaseDate').html(item.currentSubscriptions[0].purchaseDate);
                $el.find('#currentPackage .package').html(item.currentSubscriptions[0].package);
                $el.find('#currentPackage .price').html(item.currentSubscriptions[0].price);
            }

            container.find('#avatar').attr('src', item.avatar);
            container.find('.name').html(personalInfo.firstName + ' ' + personalInfo.lastName);
            container.find('.phone').html(personalInfo.phone);
            container.find('.email').html(item.email);
        }

    });

    return View;
});