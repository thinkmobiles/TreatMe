'use strict';

define([
    'text!templates/dashboard/dashboardTemplate.html'

], function (MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_dashborad').addClass('active');

            App.Breadcrumbs.reset([{name: 'Dashboard', path: '#dashboard'}]);
            App.menu.select('#nav_dashboard');

            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;

            $el.html(self.mainTemplate());

            return this;
        },

        afterRender: function (){
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_dashborad').addClass('active')
        }

    });

    return View;
});
