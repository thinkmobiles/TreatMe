
'use strict';

define([
    'views/customElements/ListView',
    'collections/bookingCollection',
    'text!/templates/pendingRequests/pendingRequestsTemplate.html',
    'text!/templates/pendingRequests/pendingRequestsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        url: '#pendingRequests',

        events: _.extend({
            //put events here ...
            'click #removeSelectedBtn': 'removeRequests'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Pending Requests', path: '#pendingRequests'}]);
            App.menu.select('#nav_pending_requests');
            ListView.prototype.initialize.call(this, options);
        },

        removeRequests: function (e) {
            var ids = this.getSelectedIds();
            console.log('>>> removeRequests');
            console.log(ids, ids.length);
        }
    });

    return View;
});