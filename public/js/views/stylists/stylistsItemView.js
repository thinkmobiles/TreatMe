'use strict';

define([
    'models/stylistModel',
    'views/services/servicesView',
    //'text!templates/stylists/itemTemplate.html',
    'text!templates/stylists/stylistsItemTemplate.html',
    'text!templates/customElements/servicesTemplate.html',
    'text!templates/stylists/previewStylistTemplate.html',
    //'views/stylists/stylistsEditView',
    //'views/stylists/stylistsClientsView',
    'text!templates/stylists/editStylistTemplate.html'
], function (StylistModel, ServicesView, MainTemplate, ServicesTemplate, PreviewStylistTemplate, /*EditView, StylistsClientsView,*/ EditStylistTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),  //TODO
        itemTemplate: _.template(EditStylistTemplate),

        servicesTemplate: _.template(ServicesTemplate),

        previewStylistTemplate: _.template(PreviewStylistTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            //"click .edit"   : "edit"
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

            var data = {
                email: 'test_' + new Date().valueOf() + '@mail.com',
                personalInfo: {
                    
                }
            };
            this.model = new StylistModel();
            this.model.on('invalid', this.handleModelValidationError);

            this.render();
            this.renderUserInfo();
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

        renderUserInfo: function () {
            var user = this.model.toJSON();
            //var userName = this.getUserName(user);
            var $el = this.$el;

            $el.find('.info').html(this.itemTemplate(user));
            //$el.find('.userName').html(userName);

            this.updateNavigation(user);

            return this;
        },

        updateNavigation: function (user) {
            var bradcrumbs;

            if (!user._id) {
                bradcrumbs = [{
                    name: 'New Applications',
                    path: '#newApplications'
                }, {
                    name: 'Add',
                    path: '#newApplications/add'
                }];
            } else if (user.approved) {
                bradcrumbs = [{
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
                bradcrumbs = [{
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

            App.Breadcrumbs.reset(bradcrumbs);
        },

        prepareSaveData: function (callback) {
            var form = this.$el.find('.stylistForm');
            var servicesBlock = form.find('.services');
            var serviceList = servicesBlock.find('input:checkbox:checked');
            var email = form.find('.email').val();
            var firstName = form.find('.firstName').val();
            var lastName = form.find('.lastName').val();
            var role = form.find('.role').val();
            var phone = form.find('.phone').val();
            var salonName = form.find('.salonName').val();
            var businessRole = form.find('.businessRole').val();
            var salonNumber = form.find('.salonNumber').val();
            var salonEmail = form.find('.salonEmail').val();
            var salonAddress = form.find('.salonAddress').val() + ' ' + form.find('.salonAddress2').val();
            var license = form.find('.license').val();
            var city = form.find('.city').val();
            var region = form.find('.region').val();
            var zip = form.find('.zip').val();
            var country = form.find('.country').val();
            var services = [];
            var service;
            var data;

            serviceList.each(function (index, element) {
                service = {};
                service.price = $(element).siblings('input:text')[index].value || 0;
                service.id = $(element).data('id');

                services.push(service);

                console.log(5);
            });
            //validation ...

            data = {
                email       : email,
                personalInfo: {
                    firstName  : firstName,
                    lastName   : lastName,
                    profession : role,
                    phoneNumber: phone
                },
                salonInfo   : {
                    salonName    : salonName,
                    phoneNumber  : salonNumber,
                    email        : salonEmail,
                    businessRole : businessRole,
                    address      : salonAddress,
                    city         : city,
                    state        : region,
                    zipCode      : zip,
                    country      : country,
                    licenseNumber: license
                },
                services    : services
            };

            callback(null, data);
        },

        saveStylist: function (event) {
            var self = this;

            self.prepareSaveData(function (err, data) {
                var model;

                if (err) {
                    self.handleError(err)
                }

                model = self.model;
                model.save(data, {
                    success: function () {
                        alert('success');
                    },
                    error  : self.handleModelError
                });
            });
        },

        renderEdit: function () {
            new EditView(this.model);
        },

        edit: function (e) {
            var id = this.model.id;
            var url = this.path + '/' + id + '/edit';

            Backbone.history.navigate(url, {trigger: true});
        }

    });

    return View;
});
