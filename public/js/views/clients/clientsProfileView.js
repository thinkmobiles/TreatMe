'use strict';

define([
    'models/clientModel',
    'text!/templates/clients/clientsProfileTemplate.html'
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
                console.log(model);
            } else {
                model = new Model();
                this.model = model;
                this.render();
                console.log(model);
            }

        },

        render: function () {
            var model = this.model.toJSON();

            this.$el.html(this.template({item: model}));

            return this;
        }
    });

    return View;
});