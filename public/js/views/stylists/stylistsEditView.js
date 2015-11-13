'use strict';

define([
    'models/stylistModel',
    'text!templates/stylists/editStylistTemplate.html'
], function (StylistModel, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        model: new StylistModel(),

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist"
        },

        initialize: function (options) {
            var self = this;

            if (options.id) {
                self.model = new StylistModel({_id: options.id});
                self.model.fetch({
                    success: function (model, JSONmodel, options) {
                        App.Breadcrumbs.reset([{
                            name: 'Stylist List',
                            path: '#stylists'
                        }, {
                            name: JSONmodel.personalInfo.firstName + ' ' + JSONmodel.personalInfo.lastName,
                            path: '#stylists/' + JSONmodel._id
                        }, {
                            name: 'edit',
                            path: '#stylists/edit/' + JSONmodel._id
                        }]);

                        self.model.on('invalid', self.handleModelValidationError);

                        return self.render(JSONmodel);
                    },
                    error: self.handleModelError
                });
            }

        },

        render: function (user) {
            var self = this;
            var $el = self.$el;

            $el.html(self.mainTemplate({user: user}));

            self.afterRender(user);
            return this;
        },

        afterRender: function (user) {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_stylists').addClass('active');
        },

        prepareSaveData: function (callback) {
            var form = this.$el.find('.stylistForm');
            var servicesBlock = form.find('.services');
            var personalInfo = form.find('.accountInfo');
            var salonInfo = form.find('.salonInfo');
            var serviceList = servicesBlock.find('input:checkbox:checked');
            //PersonalInfo
            var firstName = personalInfo.find('.firstName').val();
            var lastName = personalInfo.find('.lastName').val();
            var role = personalInfo.find('.role').val();
            var phone = personalInfo.find('.phone').val();
            // SalonInfo
            var salonName = salonInfo.find('.salonName').val();
            var businessRole = salonInfo.find('.businessRole').val();
            var salonNumber = salonInfo.find('.phone').val();
            var salonEmail = salonInfo.find('.email').val();
            var salonAddress = salonInfo.find('.address').val() + ' ' + salonInfo.find('.address2').val();
            var license = salonInfo.find('.license').val();
            var city = salonInfo.find('.city').val();
            var region = salonInfo.find('.state').val();
            var zip = form.find('.zipCode').val();
            var country = form.find('.country').val();

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
                //email: email,
                personalInfo: {
                    firstName: firstName,
                    lastName: lastName,
                    profession: role,
                    phoneNumber: phone
                },
                salonInfo: {
                    salonName: salonName,
                    phoneNumber: salonNumber,
                    email: salonEmail,
                    businessRole: businessRole,
                    address: salonAddress,
                    city: city,
                    state: region,
                    zipCode: zip,
                    country: country,
                    licenseNumber: license
                },
                services: services
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
                        console.log('success saved');
                        window.location.hash = 'stylists';
                    },
                    error: self.handleModelError
                    /*error: function (model, response, options) {
                     var errMessage = response.responseJSON.error;
                     self.handleError(errMessage);
                     }*/
                });
            });
        }

    });

    return View;
});
