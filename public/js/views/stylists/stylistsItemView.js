'use strict';

define([
    'custom',
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
], function (custom, StylistModel, ServicesView, ApplicationsServiceView, MainTemplate, ServicesTemplate, PreviewStylistTemplate, /*EditView, StylistsClientsView,*/ EditStylistTemplate) {

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

            //this.servicesView = new ApplicationsServiceView();
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
            /*var data = {
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
             };*/
            this.model = new StylistModel();
            this.model.on('invalid', this.handleModelValidationError, this);

            this.render();
            this.renderUserInfo();
            //this.serviceApplications = new ApplicationsServiceView();
            //this.servicesView = new ApplicationsServiceView();
        },

        editStylist: function (options) { // load edit for stylists and new applications.
            var userId = options.id;
            var model = new StylistModel({_id: userId});

            model.on('sync', this.renderUserInfo, this);
            model.on('error', this.handleModelError, this);
            model.on('invalid', this.handleModelValidationError, this);

            model.fetch();

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

        renderUserInfo: function (model, response, options) {
            var user = this.model.toJSON();
            var services = user.services;

            //var userName = this.getUserName(user);
            var $el = this.$el;

            $el.find('.info').html(this.itemTemplate(user));
            //$el.find('.userName').html(userName);
            //custom.canvasDraw({imageSrc: user.avatar}, self);

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

            var dataService = this.servicesView.getData();

            if (dataService === false) {
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
                services    : dataService
            };

            callback(null, data);
        },

        saveStylist: function (event) {
            var self = this;
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
            });

            /*var services = this.servicesView.getData();
             console.log(services);*/
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