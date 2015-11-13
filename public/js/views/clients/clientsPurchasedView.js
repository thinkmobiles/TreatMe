'use strict';

define([
    'views/customElements/ListView',
    'models/clientModel',
    'collections/clientsPurchasedCollection',
    'text!/templates/clients/clientsPurchasedTemplate.html',
    'text!/templates/clients/clientsPurchasedListTemplate.html'
], function (ListView, Model, Collection, ClientPurchased, ClientListTemplate) {
    var View = ListView.extend({
        el: '#clientsPurchased',

        Collection: Collection,
        mainTemplate: _.template(ClientPurchased),
        listTemplate: _.template(ClientListTemplate),

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            ListView.prototype.initialize.call(this, options);
        }
    });

    return View;
});