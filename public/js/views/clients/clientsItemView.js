'use strict';

define([
    'custom',
    'async',
    'models/clientModel',
    //'text!templates/clients/newAndEditClientsTemplate.html',
    'text!templates/clients/clientsItemTemplate.html',
    'text!templates/customElements/servicesTemplate.html'
], function (custom, async, ClientModel, MainTemplate, ServicesTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate    : _.template(MainTemplate),
        servicesTemplate: _.template(ServicesTemplate),

        events: {
            'click .saveBtn'      : 'saveClient',
            'click .avatar'       : 'changeAvatar',
            'change .changeAvatar': 'changeInputFile'
        },

        initialize: function (options) {
            App.menu.select('#nav_clients');

            if (options.id) {
                this.editClient(options);
            } else {
                this.addClient(options);
            }
        },

        addClient: function (options) {
            this.model = new ClientModel();
            this.render();
        },

        editClient: function (options) {
            var userId = options.id;
            var model = new ClientModel({_id: userId});

            this.model = model;

            model.on('sync', this.render, this);
            model.on('error', this.handleModelError, this);
            model.on('invalid', this.handleModelValidationError, this);

            model.fetch();
        },

        initialize__: function (options) {
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
                    success: function (userModel) {
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
                    error  : self.handleModelError
                });
            }
        },

        render: function () {
            var user = this.model.toJSON();

            this.updateNavigation(user);
            this.$el.html(this.mainTemplate({item: user}));

            return this;
        },

        getUserName: function (user) {
            var userName;

            if (user && user.personalInfo && user.personalInfo.firstName && user.personalInfo.lastName) {
                userName = user.personalInfo.firstName + ' ' + user.personalInfo.lastName;
            } else {
                userName = '';
            }

            return userName;
        },

        updateNavigation: function (user) {
            var breadcrumbs;

            if (!user._id) {
                breadcrumbs = [{
                    name: 'Client List',
                    path: '#clients'
                }, {
                    name: 'Add',
                    path: '#clients/add'
                }];
            } else {
                breadcrumbs = [{
                    name: 'Client List',
                    path: '#clients'
                }, {
                    name: this.getUserName(user),
                    path: '#clients/' + user._id
                }, {
                    name: 'Edit',
                    path: '#clients/' + user._id + '/edit'
                }];
            }

            App.Breadcrumbs.reset(breadcrumbs);
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
                firstName: firstName,
                lastName : lastName,
                phone    : phone,
                email    : email,
                password : password
            };

            callback(null, data)
        },

        saveClient: function (e) {
            var self = this;

            App.errorNotification('Hello world');

            /*self.prepareSaveData(function (err, data) {
                var model;

                if (err) {
                    self.handleError(err);
                }

                async.parallel({

                        //try save the client model:
                        savedModel: function (cb) {
                            cb();
                        },

                        //try to change the avatar:
                        avatar: function (cb) {
                            cb();
                        }

                    }, function (err, result) {
                        if (err) {

                        }
                    });


                model = self.model;
                model.save(data, {
                    success: function () {
                        alert('success');
                    },
                    error  : self.handleModelError
                });
            });*/
        },

        changeAvatar: function (e) {
            this.$el.find('.changeAvatar').click();
        },

        changeInputFile: function (e) {
            var avatar = this.$el.find('.avatar');
            var self = this;

            custom.getSrc(e, function (err, src) {
                if (err) {
                    return self.handleError(err);
                }

                avatar.attr('src', src);
            });

        }

    });

    return View;
});