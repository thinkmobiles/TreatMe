'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'text!templates/stylists/stylistsClientsTemplate.html',
    'text!templates/stylists/stylistsClientsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        el: '.stylistsClients',
         /*navElement: '#nav_stylists',*/
         url: '#clients',

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            ListView.prototype.initialize.call(this, options);

        }
    });

    return View;
});