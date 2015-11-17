'use strict';

define([
    'models/bookingModel',
    'text!templates/pendingRequests/itemTemplate.html',
    'Moment'
], function (StylistModel, MainTemplate, moment) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            "click #editBtn": "edit",
            "click #acceptBtn": "saveStylist",
            "click #removeBtn": "removeStylist"
        },

        initialize: function (options) {
            var self = this;
            var userId = (options && options.id) ? options.id : null;
            var model;
            model = new StylistModel({_id: userId});
            model.on('invalid', self.handleModelValidationError);
            model.fetch({
                success: function (model) {
                    self.model = model;

                    self.render();
                },
                error: self.handleModelError
            });
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var pendingRequest = self.model.toJSON();

            console.log(pendingRequest);

            var name = pendingRequest.client.personalInfo.firstName + " " + pendingRequest.client.personalInfo.lastName;

            App.Breadcrumbs.reset([{name: 'Pending Requests', path: '#pendingRequests'}, {
                name: name,
                path: '#pendingRequests/' + pendingRequest._id
            }]);

            $('.searchBlock').html('');
            pendingRequest.bookingDate = moment(pendingRequest.bookingDate).format("DD/MM/YY hh:mma");
            pendingRequest.requestDate = moment(pendingRequest.requestDate).format("DD/MM/YY hh:mma");
            $el.html(self.mainTemplate({pendingRequest: pendingRequest}));

            return this;
        }


    });

    return View;
});
