'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'views/clients/clientsProfileView',
    'views/clients/clientsAddAndEditView',
    'text!/templates/clients/clientsTemplate.html',
    'text!/templates/clients/clientsListTemplate.html'
], function (ListView, Collection, ClientProfile, NewClients, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement: '#nav_clients',
        url: '#clients',

        events: _.extend({
            //put events here ...
            'click .item'  : 'showProfile',
            'click #addClient': 'addClient'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}]);

            ListView.prototype.initialize.call(this, options);
        },

        showProfile: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            var id = tr.attr('data-id');
            Backbone.history.navigate('clients/' + id, {trigger: true});
        },

        addClient: function () {
            Backbone.history.navigate('clients/add', {trigger: true});
        }
    });

    return View;
});