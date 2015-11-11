
'use strict';

define([
    'views/customElements/ListView',
    'collections/bookingCollection',
    'text!/templates/bookings/bookingsTemplate.html',
    'text!/templates/bookings/bookingsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement: '#nav_pending_requests',
        url: '#pendingRequests',

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Pending Requests', path: '#pendingRequests'}]);

            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});