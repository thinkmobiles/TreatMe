'use strict';

define([
    'views/customElements/ListView',
    'collections/serviceCollection',
    'text!templates/services/servicesTemplate.html', //TODO: ...
    'text!templates/services/servicesListTemplate.html' //TODO: ...
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Services', path: '#services'}]);
            App.menu.select('#nav_services');

            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});
