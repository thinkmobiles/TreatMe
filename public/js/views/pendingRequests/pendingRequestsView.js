
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

        navElement: '#nav_pending_requests',
        url: '#pendingRequests',

        events: _.extend({
            //put events here ...
            'click #removeSelectedBtn': 'removeRequests',
            "click .table td": "showDetails"
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Pending Requests', path: '#pendingRequests'}]);

            ListView.prototype.initialize.call(this, options);
        },

        removeRequests: function (e) {
            var ids = this.getSelectedIds();
            console.log('>>> removeRequests');
            console.log(ids, ids.length);
        },
        showDetails: function (e) {
            var element = $(e.target);
            var id;

            if (!element.closest('td').children().length) {
                id = element.closest('tr').attr('data-id');
                Backbone.history.navigate('pendingRequests/' + id, {trigger: true});
            }

            return this;
        }
    });

    return View;
});