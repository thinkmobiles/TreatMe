'use strict';

define([
    'views/customElements/ListView',
    'collections/bookingCollection',
    'text!/templates/bookings/bookingsTemplate.html',
    'text!/templates/bookings/bookingsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection  : Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement  : '#nav_bookings',
        url         : '#bookings',
        removeParams: {
            url           : 'admin/appointments',
            confirmMessage: 'Are you sure want to remove appointment(s)?'
        },

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Bookings', path: '#bookings'}]);

            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});

/*
 'use strict';

 define([
 'text!templates/bookings/bookingsTemplate.html'

 ], function (MainTemplate) {

 var View;

 View = Backbone.View.extend({

 el : '#wrapper',

 mainTemplate : _.template(MainTemplate),

 events: {
 },

 initialize: function () {
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
 navContainer.find('#nav_bookings').addClass('active')
 }

 });

 return View;
 });
 */
