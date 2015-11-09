'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'text!/templates/clients/clientsTemplate.html',
    'text!/templates/clients/clientsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        navElement: '#nav_clients',
        url: '#clients',

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}]);

            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});