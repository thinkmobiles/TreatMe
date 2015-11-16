'use strict';

define([
    'models/stylistModel',
    'views/services/servicesView',
    'text!templates/stylists/itemTemplate.html',
    'text!templates/customElements/servicesTemplate.html',
    'text!templates/stylists/previewStylistTemplate.html',
    'views/stylists/stylistsEditView',
    'views/stylists/stylistsClientsView'
], function (StylistModel, ServicesView, MainTemplate, ServicesTemplate, PreviewStylistTemplate, EditView, StylistsClientsView) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        servicesTemplate: _.template(ServicesTemplate),

        previewStylistTemplate: _.template(PreviewStylistTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            "click .edit"   : "renderEdit"
        },

        initialize: function (options) {
            var self = this;
            var userId = (options && options.id) ? options.id : null;

            if (!userId) {
                this.addStylist(options);
                /*self.model = new StylistModel();
                 App.Breadcrumbs.reset([{name: 'New Applications', path: '#stylists'}, {
                 name: 'Add Application',
                 path: '#stylists/add'
                 }]);
                 self.model.on('invalid', self.handleModelValidationError);

                 return self.render();*/
            } else {
                self.model = new StylistModel({_id: userId});
                self.model.fetch({
                    success: function (model, JSONmodel, options) {
                        App.Breadcrumbs.reset([{
                            name: 'Stylist List',
                            path: '#stylists'
                        }, {
                            name: JSONmodel.personalInfo.firstName + ' ' + JSONmodel.personalInfo.lastName,
                            path: '#stylists/' + userId
                        }]);

                        self.model.on('invalid', self.handleModelValidationError);

                        return self.render(JSONmodel);
                    },
                    error  : self.handleModelError

                });

            }

        },

        addStylist: function (options) {
            var self = this;

            App.Breadcrumbs.reset([{
                name: 'New Applications',
                path: '#newApplications'
            }, {
                name: 'Add Application',
                path: '#newApplications/add'
            }]);

            App.menu.select('#nav_new_applications');

            self.model = new StylistModel();
            self.model.on('invalid', self.handleModelValidationError);

            return self.render();
        },

        render: function () {
            var model = this.model.toJSON();

            this.$el.html(this.mainTemplate({user: model}));

            /*
            user
                ? $el.html(self.previewStylistTemplate({user: user}))
                : $el.html(self.mainTemplate({user: {}}));
            */

            //this.stylistsClientsView = new StylistsClientsView({id: user._id});
            //self.afterRender(user);
            return this;
        },

        afterRender: function (user) {
            var self = this;

            if (!user) {
                $.ajax({
                    type       : 'GET',
                    dataType   : 'json',
                    contentType: 'application/json',
                    url        : '/admin/services',
                    success    : function (data) {
                        serviceContainer.html(self.servicesTemplate({services: data}));
                    },
                    error      : function (err) {
                        alert(err);
                    }
                })
            }

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
        }

    });

    return View;
});
