'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'text!/templates/clients/clientsTemplate.html',
    'text!/templates/clients/clientsListTemplate.html'
], function (ListView, ClientsCollection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: ClientsCollection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        navElement: '#nav_clients',

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}]);

            ListView.prototype.initialize.call(this);
        }
    });

    return View;
});