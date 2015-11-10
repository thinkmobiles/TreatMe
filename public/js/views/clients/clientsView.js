'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'views/clients/clientsProfileView',
    'text!/templates/clients/clientsTemplate.html',
    'text!/templates/clients/clientsListTemplate.html'
], function (ListView, Collection, ClientProfile, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement: '#nav_clients',
        url: '#clients',

        events: {
          'click .item': 'showProfile'
        },

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}]);

            ListView.prototype.initialize.call(this, options);
        },

        showProfile: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            var id = tr.attr('data-id');
            Backbone.history.navigate('clients/' + id, {trigger: true});
        }
    });

    return View;
});