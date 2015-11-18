'use strict';

define([
    'models/stylistModel',
    'views/newApplications/newApplicationsServiceView',
    'text!templates/stylists/stylistsDetailsTemplate.html',
    'text!templates/newApplications/itemTemplate.html',
    'text!templates/stylists/previewStylistTemplate.html'
], function (StylistModel, ApplicationsServiceView, MainTemplate, ItemTemplate, StylistsItemTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),
        itemTemplate: _.template(StylistsItemTemplate),
        //itemTemplate: _.template(ItemTemplate),

        events: {
            "click .saveBtn"  : 'saveStylist',
            "click #editBtn"  : 'edit',
            "click #acceptBtn": 'saveStylist',
            "click #removeBtn": 'removeStylist'
        },

        initialize: function (options) {
            var userId = options.id;
            var path = options.type;
            var model;

            if (path === 'newApplications') {
                App.Breadcrumbs.reset([{
                    name: 'New Applications',
                    path: '#newApplications'
                }]);
                App.menu.select('#nav_new_applications');
            } else {
                App.Breadcrumbs.reset([{
                    name: 'Stylist List',
                    path: '#stylists'
                }]);
                App.menu.select('#nav_stylists');
            }

            model = new StylistModel({_id: userId});

            model.on('sync', this.renderUserInfo, this);
            model.on('error', this.handleModelError, this);
            model.on('invalid', this.handleModelValidationError, this);

            this.model = model;
            this.path = path;
            this.render();

            model.fetch();
        },

        render: function () {
            var opts = {
                path: this.path
            };

            this.$el.html(this.mainTemplate(opts));

            return this;
        },

        renderUserInfo: function () {
            var user = this.model.toJSON();
            var userName = this.getUserName(user);
            var createdAt = new Date(user.createdAt).toLocaleDateString();
            var $el = this.$el;

            $el.find('.info').html(this.itemTemplate({user: user}));
            $el.find('.userName').html(userName);
            $el.find('.calendar').html(createdAt);

            this.updateNavigation(user);

            return this;
        },

        getUserName: function (user) {
            return user.personalInfo.firstName + ' ' + user.personalInfo.lastName;
        },

        updateNavigation: function (user) {
            if (user.approved) {
                App.Breadcrumbs.reset([{
                    name: 'Stylist List',
                    path: '#stylists'
                }, {
                    name: this.getUserName(user),
                    path: '#stylists/' + user._id
                }]);
            }
        },

        edit: function (e) {
            var id = this.model.id;
            var url = this.path + '/' + id + '/edit';

            Backbone.history.navigate(url, {trigger: true});
        },

        prepareSaveData: function (callback) {
            var form = this.$el.find('.stylistForm');
            var servicesBlock = form.find('.services');
            var serviceList = servicesBlock.find('input:checkbox:checked');
            var email = form.find('#email').val();
            var firstName = form.find('#firstName').val();
            var lastName = form.find('#lastName').val();
            var role = form.find('#role').val();
            var phone = form.find('#phone').val();
            var salonName = form.find('#salonName').val();
            var businessRole = form.find('#businessRole').val();
            var salonNumber = form.find('#salonNumber').val();
            var salonEmail = form.find('#salonEmail').val();
            var salonAddress = form.find('#salonAddress').val() + ' ' + form.find('#salonAddress2').val();
            var license = form.find('#license').val();
            var city = form.find('#city').val();
            var region = form.find('#region').val();
            var zip = form.find('#zip').val();
            var country = form.find('#country').val();
            var services = [];
            var service;
            var data;

            serviceList.each(function (index, element) {
                service = {};
                service.price = $(element).siblings('input:text')[index].value || 0;
                service.id = $(element).data('id');

                services.push(service);
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
                services    : services/*,
                 approved: true*/
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
                model.updateCurrent(data, {
                    success: function () {
                        console.log('success created');
                        window.location.hash = 'newApplications';
                    },
                    error  : self.handleModelError
                    /*error: function (model, response, options) {
                     var errMessage = response.responseJSON.error;
                     self.handleError(errMessage);
                     }*/
                });
            });
        },

        removeStylist: function () {
            var data = {
                ids: [this.model.id]
            };
            data = JSON.stringify(data);

            this.model.deleteRequest(data, function () {
                console.log('success removed');
                window.location.hash = 'newApplications';
            });
        }

    });

    return View;
});
