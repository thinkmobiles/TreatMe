'use strict';

define([
    'collections/stylistCollection',
    'text!templates/newApplications/newApplicationsTemplate.html'

], function (StylistCollection, MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function () {
            var self = this;

            self.collection = [];

            $.ajax({
                type: 'GET',
                url: '/admin/stylist/requested',
                success: function (data) {
                    self.collection = new StylistCollection(data);
                    self.render();
                },
                error  : self.handleErrorResponse
            });
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var users = self.collection.toJSON();

            $el.html(self.mainTemplate({users: users}));

            return this;
        },

        afterRender: function (){
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_new_applications').addClass('active')
        }

    });

    return View;
});
