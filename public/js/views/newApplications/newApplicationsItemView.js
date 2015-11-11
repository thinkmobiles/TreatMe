'use strict';

define([
    'models/stylistModel',
    'text!templates/newApplications/itemTemplate.html'
], function (StylistModel, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            "click #editBtn": "edit",
            "click #acceptBtn": "saveStylist"
        },

        initialize: function (options) {
            var self = this;
            var userId = (options && options.id) ? options.id: null;
            var model;

            if (!userId) {
                this.model = new StylistModel();
                App.Breadcrumbs.reset([{name: 'New Applications', path: '#newApplications'}, {name: 'Add Application', path: '#newApplications/add'}]);
                this.render();

            } else {
                App.Breadcrumbs.reset([{name: 'New Applications', path: '#newApplications'}, {name: 'Add Application', path: '#newApplications/' + userId}]);
                model = new StylistModel({_id: userId});
                model.fetch({
                    success: function (model) {
                        self.model = model;
                        self.render();
                    },
                    error: self.handleModelError
                });
            }

        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var user = self.model.toJSON();

            console.log(user);
            $('.searchBlock').html('');
            $el.html(self.mainTemplate({user: user}));

            return this;
        },

        afterRender: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_new_applications').addClass('active')
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
                services: services/*,
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
                    error: self.handleModelError
                    /*error: function (model, response, options) {
                     var errMessage = response.responseJSON.error;
                     self.handleError(errMessage);
                     }*/
                });
            });
        },

        edit : function () {
            console.log('Fire edit event!');
            $('input:disabled').prop('disabled', false);
        }

    });

    return View;
});
