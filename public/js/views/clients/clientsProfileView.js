'use strict';

define([
    'models/clientModel',
    'text!/templates/clients/clientsProfileView.html'
], function (Model, ClientProfile) {
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
                        self.render();
                    },
                    error: self.handleModelError
                });

            } else {
                model = new Model();
                this.model = model;
                this.render();
            }

        },

        render: function () {
            var model = this.model;

            this.$el.html(this.template({item: model}));

            return this;
        }
    });

    return View;
});