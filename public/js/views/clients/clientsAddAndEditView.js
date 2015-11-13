'use strict';

define([
    'models/clientModel',
    'text!templates/clients/newAndEditClientsTemplate.html',
    'text!templates/customElements/servicesTemplate.html',
], function (ClientModel, ClientAddTemplate, ServicesTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(ClientAddTemplate),
        servicesTemplate: _.template(ServicesTemplate),

        events: {
        },

        initialize: function (options) {
            var self = this;
            var userId = (options && options.id) ? options.id : null;
            var model;

            if (!userId) {
                this.model = new ClientModel();
                App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {
                    name: 'Add client',
                    path: '#client/add'
                }]);
                return self.render();
            } else {
                model = new ClientModel({_id: userId});
                model.fetch({
                    success: function (userModel){
                        self.model = userModel;
                        console.log(self.model);
                        App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {
                            name: self.model.toJSON().name,
                            path: '#clients/:id'
                        }, {
                            name: 'Edit',
                            path: '#clients/:id/edit'
                        }]);
                        return self.render();
                    },
                    error: self.handleModelError
                });

                this.render();
            }
        },

        render: function(){
            var item = this.model.toJSON();

            this.$el.html(this.mainTemplate({item: item}));

            return this;
        }

    });

    return View;
});