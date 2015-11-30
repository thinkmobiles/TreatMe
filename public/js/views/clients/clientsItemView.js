'use strict';

define([
    'custom',
    'asyncjs',
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
            'change .changeAvatar': 'changeInputFile',
            'click .errorBtn': 'testError',
            'click .warningBtn': 'testWarning',
            'click .successBtn': 'testSuccess'
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
            var model = new ClientModel();

            //model.on('error', this.handleModelError, this);
            //model.on('error', this.handleModelError, this);
            model.on('error', function (model, res, options) {
                var err = res.responseJSON || res.responseJSON.message;
                App.notification(err);
            }, this);

            model.on('invalid', this.handleModelValidationError, this);

            this.model = model;
            this.render();
        },

        editClient: function (options) {
            var userId = options.id;
            var model = new ClientModel({_id: userId});
            var self = this;

            this.model = model;

            //model.on('error', this.handleModelError, this);
            model.on('error', function (model, res, options) {
                var err = res.responseJSON || res.responseJSON.message;
                App.notification(err);
            }, this);

            model.on('invalid', this.handleModelValidationError, this);

            model.fetch({
                success: function () {
                    self.render();
                },
                error  : function (model, res) {
                    var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                    App.notification(err);
                }
            });
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
                email       : email,
                password    : password,
                personalInfo: {
                    firstName: firstName,
                    lastName : lastName,
                    phone    : phone
                }
            };

            callback(null, data)
        },

        saveClient: function (e) {
            var self = this;

            async.waterfall([

                //try save the client model:
                function (cb) {
                    self.prepareSaveData(function (err, data) {
                        if (err) {
                            return cb(err);
                        }

                        self.model.save(data, {
                            success: function (model) {
                                cb(null, model);
                            }
                        });
                    });
                },

                //try to change the avatar:
                function (model, cb) {
                    var image = self.$el.find('.avatar');
                    var src;
                    var data;

                    if (image.attr('data-changed') !== 'true') {
                        return cb(); //the avatar was not changed
                    }

                    src = image.attr('src');
                    data = {
                        userId: model.id,
                        avatar: src
                    };

                    $.ajax({
                        type       : 'POST',
                        dataType   : 'json',
                        contentType: 'application/json',
                        url        : '/avatar',
                        data       : JSON.stringify(data),
                        success    : function () {
                            //App.notification({message: 'Success updated', type: 'success'});
                            cb(null, model);
                        },
                        error      : function (xhr) {
                            var err = xhr.responseJSON.error || xhr.responseJSON.message;
                            cb(err);
                        }
                    });

                }

            ], function (err, result) {
                if (err) {
                    return App.notification(err);
                }
                App.notification({message: 'Client was saved success', type: 'success'});
            });

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
                avatar.attr('data-changed', 'true');
            });

        },

        testError: function () {
            App.notification({message: 'Custom error', type: 'error'});
        },

        testWarning: function () {
            App.notification({message: 'Custom warning', type: 'warning'});
        },

        testSuccess: function () {
            App.notification({message: 'Custom success', type: 'success'});
        }

    });

    return View;
});