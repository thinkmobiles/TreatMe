'use strict';

define([
    'models/stylistModel',
    'text!templates/newApplications/itemTemplate.html'
], function (StylistModel, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist"
        },

        initialize: function (options) {
            var userId = (options && options.id) ? options.id: null;

            if (!userId) {
                this.model = new StylistModel();
                App.Breadcrumbs.reset([{name: 'New Applications', path: '#newApplications'}, {name: 'Add Application', path: '#newApplications/add'}]);
                return this.render();
            }
            console.log('Need Fetch ...'); //TODO: ...
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var user = {}; //new user

            $el.html(self.mainTemplate({user: user}));

            return this;
        },

        afterRender: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_stylists').addClass('active')
        },

        prepareSaveData: function (callback) {
            var form = this.$el.find('.stylistForm');
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
            var data;

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
                }
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
                        alert('success created');
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
