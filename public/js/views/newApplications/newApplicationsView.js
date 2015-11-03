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
            "click #acceptCurrentBtn": "acceptStylist"
        },

        initialize: function () {
            var self = this;

            self.collection = [];

            $.ajax({
                type: 'GET',
                url: '/admin/stylist?status=requested',
                success: function (data) {
                    self.collection = new StylistCollection(data);
                    self.render(); //TODO: use collection on reset !
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
        },

        acceptStylist: function (e) {
            var el = e.target;
            var self = this;
            var data = {
                ids: []
            };

            if (el.id === 'acceptCurrentBtn') {
                data.ids.push($(el).closest('tr').attr('data-id'));
                data = JSON.stringify(data);

                $.ajax({
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json',
                    url: '/admin/stylist/approve',
                    data: data,
                    success: function () {
                        alert('Approve');
                        self.initialize();

                    },
                    error  : self.handleErrorResponse
                })
            }

        }

    });

    return View;
});
