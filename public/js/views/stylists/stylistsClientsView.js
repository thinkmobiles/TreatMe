'use strict';

define([
    'views/customElements/ListView',
    'models/clientModel',
    'collections/stylistClientsCollection',
    'text!templates/stylists/stylistsClientsTemplate.html',
    'text!templates/stylists/stylistsClientsListTemplate.html'
], function (ListView, Model, Collection, MainTemplate, ListTemplate) {
    var View = ListView.extend({
        el: '.stylistsClients',

        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            ListView.prototype.initialize.call(this, options);
        }

    });

    return View;
});