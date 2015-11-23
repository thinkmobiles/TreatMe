'use strict';

define([
    'custom',
    'models/clientModel',
    'text!templates/clients/newAndEditClientsTemplate.html',
    'text!templates/customElements/servicesTemplate.html',
], function (custom, ClientModel, ClientAddTemplate, ServicesTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(ClientAddTemplate),
        servicesTemplate: _.template(ServicesTemplate),

        events: {
            'click .saveBtn': 'saveClients',
            'click #avatar' : 'changeAvatar'
        },

        initialize: function (options) {
            var userId = (options && options.id) ? options.id : null;
            var self = this;
            var model;

            if (!userId) {
                this.model = new ClientModel();
                App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {
                    name: 'Add client',
                    path: '#client/add'
                }]);
                App.menu.select('#nav_clients');
                return self.render();
            } else {
                model = new ClientModel({_id: userId});
                model.fetch({
                    success: function (userModel){
                        self.model = userModel;
                        App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {
                            name: self.model.toJSON().firstName + ' ' + self.model.toJSON().lastName,
                            path: '#clients/:id'
                        }, {
                            name: 'Edit',
                            path: '#clients/:id/edit'
                        }]);
                        App.menu.select('#nav_clients');

                        self.model.on('invalid', self.handleModelValidationError, self);

                        return self.render();
                    },
                    error: self.handleModelError
                });
            }
        },

        render: function(){
            var item = this.model.toJSON();
            var self = this;

            this.$el.html(this.mainTemplate({item: item}));

            custom.canvasDraw({imageSrc: item.avatar}, self);

            return this;
        },

        prepareSaveData: function (callback) {
            var thisEl = this.$el.find('.infoAccount');
            var data;
            var firstName = thisEl.find('.firstName').val();
            var lastName = thisEl.find('.lastName').val();
            var phone = thisEl.find('.phone').val();
            var email = thisEl.find('.email').val();
            var password = thisEl.find('.password').val();

            data = {
                firstName : firstName,
                lastName  : lastName,
                phone     : phone,
                email     : email,
                password  : password
            };

            callback(null, data)
        },

        saveClients: function (e) {
            var self = this;

            self.prepareSaveData(function (err, data) {
                var model;

                if (err) {
                    self.handleError(err);
                }

                model = self.model;
                model.save(data, {
                    success: function () {
                        alert('success');
                    },
                    error: self.handleModelError
                });
            });
        },

        changeAvatar: function (e) {
            this.$el.find('#changeAvatar').click();
        }

    });

    return View;
});