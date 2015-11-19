'use strict';

define([
    'models/stylistModel',
    'text!templates/stylists/stylistsDetailsTemplate.html',
    'text!templates/newApplications/itemTemplate.html',
    'text!templates/stylists/previewStylistTemplate.html'
], function (StylistModel, MainTemplate, ItemTemplate, StylistsItemTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),
        itemTemplate: _.template(StylistsItemTemplate),
        //itemTemplate: _.template(ItemTemplate),

        events: {
            "click .saveBtn"   : 'saveStylist',
            "click #editBtn"   : 'edit',
            "click #acceptBtn" : 'saveStylist',
            "click #removeBtn" : 'remove',
            "click #suspendBtn": 'suspend'
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
                model.save(data, {
                    success: function () {
                        console.log('>>> success saved');
                    }
                });
                /*model.updateCurrent(data, {
                 success: function () {
                 console.log('success created');
                 window.location.hash = 'newApplications';
                 },
                 error  : self.handleModelError
                 /!*error: function (model, response, options) {
                 var errMessage = response.responseJSON.error;
                 self.handleError(errMessage);
                 }*!/
                 });*/
            });
        },

        suspend: function (options) {
            var self = this;
            var opts = options || {};
            var onConfirm = opts.onConfirm;
            var buttons = {
                "Save": onConfirm
            };
            var dialogOptions = {
                resizable: false,
                modal    : true,
                width: 500,
                buttons  : buttons
            };
            var dialogContainer = $('#dialog-form').dialog(dialogOptions);
            var form = dialogContainer.find( "form" ).on( "submit", function( event ) {
                event.preventDefault();
                var reason = self.$el.find('#reason').text();
                console.log(' >>> reason', reason, reason.length);

                if (!reason) {
                    self.$el.find('.prompt').html('Please input the reason of suspension');
                } else {
                    console.log('success');
                }

            });
            dialogContainer.dialog('open');
        },

        remove: function () {
            var self = this;

            this.removeConfirm({
                message  : 'Are you sure want to delete this profile?',
                onConfirm: function () {
                    $("#dialog").dialog('close');
                    self.removeStylist();
                }
            });
        },

        removeStylist: function () {
            this.model.deleteRequest({
                success : function () {
                    console.log('success deleted');
                }, error: this.handleErrorResponse
            });
        },

        removeConfirm: function (options) {
            var opts = options || {};
            var message = opts.message;
            var onConfirm = opts.onConfirm;
            var onCancel = opts.onCancel || function () {
                    $("#dialog").dialog('close');
                };
            var buttons = {
                "Delete": onConfirm,
                "Cancel": onCancel
            };
            var dialogOptions = {
                resizable: false,
                modal    : true,
                buttons  : buttons
            };
            var dialogContainer = $('#dialog');

            dialogContainer.find('.message').html(message);
            dialogContainer.dialog(dialogOptions);
        },

    });

    return View;
});
