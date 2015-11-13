'use strict';

define([
    'views/customElements/ListView',
    'collections/clientPackagesCollection',
    'text!templates/clientPackages/clientPackagesTemplate.html',
    'text!templates/clientPackages/clientPackagesListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement: '#nav_client_packages',
        url: '#clientPackages',

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Client Packages', path: '#clientPackages'}]);

            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});