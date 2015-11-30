'use strict';

define([
    'text!templates/dashboard/dashboardTemplate.html'

], function (MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
            "click .statisticsBtn": "statisticsSelect"
        },

        initialize: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_dashborad').addClass('active');

            App.Breadcrumbs.reset([{name: 'Dashboard', path: '#dashboard'}]);
            App.menu.select('#nav_dashboard');

          //  this.statisticsSelect();
            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;

            $el.html(self.mainTemplate());

            return this;
        },

        afterRender: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_dashborad').addClass('active')
        },

        statisticsSelect: function (e) {
            var divContainer = this.$el.find('.statisticsMenu');
            var target =  $(e.target);
            var period;

            divContainer.find('.active').removeClass('active');
            target.addClass('active');
            period = target.closest('li').data('interval');

            this.statisticsShow(period);
        },

       /* renderStatistics: function (res) {
            var self = this;
            var thisEl = this.$el;
            var container = thisEl.find('.statisticsOverview');

            container.find('.requestsSent').html(res.requestSent);
            container.find('.appointmentsBooked').html(res.appointmentBooked);
            container.find('.packagesSold').html(res.packageSold);
            console.log(res);
        },*/

        statisticsShow: function (period) {
            var self = this;
            var thisEl = this.$el;
            var container = thisEl.find('.statisticsOverview');

            var data = {
                period: period
            };

            $.ajax({
                url  : 'admin/statistic/overview',
                type : 'GET',
                dataType: 'json',
                data : data,
                success : function (res) {
                    container.find('.requestsSent').html(res.requestSent);
                    container.find('.appointmentsBooked').html(res.appointmentBooked);
                    container.find('.packagesSold').html(res.packageSold);
                },
                error  : function (res) {
                    var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                    App.notification(err);
                }
            });
        }

    });

    return View;
});
