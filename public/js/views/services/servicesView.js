'use strict';

define([
    'views/customElements/ListView',
    'collections/serviceCollection',
    'text!templates/services/servicesTemplate.html', //TODO: ...
    'text!templates/stylists/stylistsListTemplate.html' //TODO: ...
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        initialize: function (options) {
            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});