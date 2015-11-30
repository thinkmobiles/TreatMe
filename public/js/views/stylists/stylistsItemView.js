'use strict';

define([
    'custom',
    'asyncjs',
    'models/stylistModel',
    'views/services/servicesView',
    'views/newApplications/newApplicationsServiceView',
    //'text!templates/stylists/itemTemplate.html',
    'text!templates/stylists/stylistsItemTemplate.html',
    'text!templates/customElements/servicesTemplate.html',
    'text!templates/stylists/previewStylistTemplate.html',
    //'views/stylists/stylistsEditView',
    //'views/stylists/stylistsClientsView',
    'text!templates/stylists/editStylistTemplate.html'
], function (custom, async, StylistModel, ServicesView, ApplicationsServiceView, MainTemplate, ServicesTemplate, PreviewStylistTemplate, /*EditView, StylistsClientsView,*/ EditStylistTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),  //TODO
        itemTemplate: _.template(EditStylistTemplate),

        servicesTemplate: _.template(ServicesTemplate),

        previewStylistTemplate: _.template(PreviewStylistTemplate),

        events: {
            'click .saveBtn'      : 'saveStylist',
            'click .avatar'       : 'changeAvatar',
            'change .changeAvatar': 'changeInputFile'
        },

        initialize: function (options) {
            var path = options.type;

            this.path = path;

            if (options.id) {
                this.editStylist(options);
            } else {
                this.addStylist(options);
            }

            if (path === 'newApplications') {
                App.menu.select('#nav_new_applications');
            } else {
                App.menu.select('#nav_stylists');
            }
        },

        addStylist: function (options) {
            App.Breadcrumbs.reset([{
                name: 'New Applications',
                path: '#newApplications'
            }, {
                name: 'Add Application',
                path: '#newApplications/add'
            }]);

            App.menu.select('#nav_new_applications');

            var ticks = new Date().valueOf();
            var data = {
             email       : 'test_' + ticks + '@mail.com',
             personalInfo: {
             firstName : 'nazarovits',
             lastName  : 'istvan',
             phone     : '+38 093 000 0000',
             profession: 'profession'
             },
             salonInfo   : {
             salonName    : 'mySalon',
             businessRole : 'Stylist',
             phone        : '+38 093 111 1111',
             email        : 'test_' + ticks + '@mail.com',
             address      : 'PS street, ...',
             licenseNumber: 'License 123',
             zipCode      : '88000',
             state        : 'Закарпаття',
             country      : 'Ukraine',
             city         : 'Ужгород'
             }
             };
            this.model = new StylistModel(data);
            //this.model = new StylistModel();
            this.model.on('invalid', this.handleModelValidationError, this);

            this.render();
            this.renderUserInfo();
        },

        editStylist: function (options) { // load edit for stylists and new applications.
            var userId = options.id;
            var model = new StylistModel({_id: userId});
            var self = this;

            //model.on('sync', this.renderUserInfo, this);
            model.on('error', function (model, res, options) {
                var err = res.responseJSON || res.responseJSON.message;
                App.notification(err);
            }, this);

            model.on('invalid', this.handleModelValidationError, this);

            model.fetch({success: function () {
                self.renderUserInfo();
            }});

            this.model = model;
            this.render();
        },

        render: function () {
            var opts = {
                path: this.path
            };

            this.$el.html(this.mainTemplate(opts));

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

        renderUserInfo: function () {
            var user = this.model.toJSON();
            var services = user.services;
            var $el = this.$el;

            $el.find('.info').html(this.itemTemplate(user));

            this.servicesView = new ApplicationsServiceView({services: services});
            this.servicesView.render();
            this.updateNavigation(user);

            return this;
        },

        updateNavigation: function (user) {
            var breadcrumbs;

            if (!user._id) {
                breadcrumbs = [{
                    name: 'New Applications',
                    path: '#newApplications'
                }, {
                    name: 'Add',
                    path: '#newApplications/add'
                }];
            } else if (user.approved) {
                breadcrumbs = [{
                    name: 'Stylist List',
                    path: '#stylists'
                }, {
                    name: this.getUserName(user),
                    path: '#stylists/' + user._id
                }, {
                    name: 'Edit',
                    path: '#stylists/' + user._id + '/edit'
                }];
            } else {
                breadcrumbs = [{
                    name: 'New Applications',
                    path: '#newApplications'
                }, {
                    name: this.getUserName(user),
                    path: '#newApplications/' + user._id
                }, {
                    name: 'Edit',
                    path: '#newApplications/' + user._id + '/edit'
                }];
            }

            App.Breadcrumbs.reset(breadcrumbs);
        },

        prepareSaveData: function (callback) {
            var form = this.$el.find('.stylistForm');
            var servicesBlock = form.find('.services');
            var serviceList = servicesBlock.find('input:checkbox:checked');
            var email = form.find('.email').val();
            var firstName = form.find('.firstName').val();
            var lastName = form.find('.lastName').val();
            var profession = form.find('.profession').val();
            var phone = form.find('.personalPhone').val();
            var salonName = form.find('.salonName').val();
            var businessRole = form.find('.businessRole').val();
            var salonPhone = form.find('.salonPhone').val();
            var salonEmail = form.find('.salonEmail').val();
            var salonAddress = form.find('.address').val() + form.find('.address2').val();
            var licenseNumber = form.find('.licenseNumber').val();
            var city = form.find('.city').val();
            var state = form.find('.state').val();
            var zipCode = form.find('.zipCode').val();
            var country = form.find('.country').val();
            var avatarBASE64 = form.find('.avatar').attr('src');

            var data;

            var services = this.servicesView.getData();

            if (!services) {
                return callback('Please fill Price field or Incorrect format Price');
            }

            //validation ...

            data = {
                avatar      : avatarBASE64,
                email       : email,
                personalInfo: {
                    firstName : firstName,
                    lastName  : lastName,
                    profession: profession,
                    phone     : phone
                },
                salonInfo   : {
                    salonName    : salonName,
                    phone        : salonPhone,
                    email        : salonEmail,
                    businessRole : businessRole,
                    address      : salonAddress,
                    city         : city,
                    state        : state,
                    zipCode      : zipCode,
                    country      : country,
                    licenseNumber: licenseNumber
                },
                services    : services
            };

            callback(null, data);
        },

        saveStylist: function (event) {
            /*var self = this;
            var form = this.$el.find('.stylistForm');
            var image = form.find('.avatar');

            if (image.data('changed')) {
                this.avatarBASE64 = image.attr('src');
            } else {
                this.avatarBASE64 = null;
            }

            self.prepareSaveData(function (err, data) {
                var model;

                if (err) {
                    return self.handleError(err)
                }

                model = self.model;
                model.save(data, {
                    success: function () {
                        var src = self.avatarBASE64;

                        if (src) {
                            console.log('>>> change the avatar');
                            self.saveTheAvatar(src, function (res) {
                                alert('success saved the user + avatar');
                            });
                        } else {
                            alert('success saved');
                        }

                    },
                    error  : self.handleModelError
                });
            });*/

            var self = this;

            async.waterfall([

                //prepare the save data for model:
                function (cb) {
                    self.prepareSaveData(cb);
                },

                //try to save the model:
                function (data, cb) {
                    self.model.save(data, {
                        success: function (model, res) {
                            cb(null, model);
                        },
                        error: function (model, res) {
                            var err = res.responseJSON || res.responseJSON.message;
                            cb(err);
                        }
                    });
                },

                //try to save the avatar (if changed)
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
                            cb(null, model);
                        },
                        error      : function (xhr) {
                            var err = xhr.responseJSON.error || xhr.responseJSON.message;
                            cb(err);
                        }
                    });
                }

            ], function (err, model) {
                if (err) {
                    return App.notification(err);
                }
                App.notification({message: 'Stylist was saved success', type: 'success'});
            });
        },

        edit: function (e) {
            var id = this.model.id;
            var url = this.path + '/' + id + '/edit';

            Backbone.history.navigate(url, {trigger: true});
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

        saveTheAvatar: function (src, callback) {
            var userId = this.model.id;
            var src = src;
            var data = {
                userId: userId,
                avatar: src
            };
            var self = this;

            if (!userId || !src) {
                return console.error('Not enough incoming parameters.');
            }

            $.ajax({
                type       : 'POST',
                dataType   : 'json',
                contentType: 'application/json',
                url        : '/avatar',
                data       : JSON.stringify(data),
                success    : function (res) {
                    callback(res);
                },
                error      : self.handleErrorResponse
            });
        }

    });

    return View;
});