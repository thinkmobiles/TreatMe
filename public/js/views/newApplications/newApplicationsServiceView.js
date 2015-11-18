'use strict';

define([
    'collections/applicationsServiceCollection',
    'models/serviceApplicationsModel',
    'text!templates/newApplications/serviceTemplate.html'
], function ( Collection, StylistModel, MainTemplate) {

    var View = Backbone.View.extend({

        el: '#serviceApplications',

        Collection: Collection,
        mainTemplate: _.template(MainTemplate),

        events: {
        },

        initialize: function (options) {
            var collection = new Collection();

            collection.on('reset', this.render, this);

            this.collection = collection;

        },

        render: function () {
            var collection = this.collection.toJSON();

            this.$el.html(this.mainTemplate({services: collection}));

            return this;
        }

        /*prepareSaveData: function (callback) {
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
                services: services/!*,
                 approved: true*!/
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
                    /!*error: function (model, response, options) {
                     var errMessage = response.responseJSON.error;
                     self.handleError(errMessage);
                     }*!/
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
        },

        edit : function () {
            console.log('Fire edit event!');
            $('input:disabled').prop('disabled', false);
        }*/

    });

    return View;
});
