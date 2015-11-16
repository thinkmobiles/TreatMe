
'use strict';

define([
    'views/customElements/ListView',
    'collections/stylistPaymentCollection',
    'text!/templates/stylistPayments/stylistPaymentsTemplate.html',
    'text!/templates/stylistPayments/stylistPaymentsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        url: '#stylistPayments',

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Stylist Payments', path: '#stylistPayments'}]);
            App.menu.select('#nav_stylist_payments');

            ListView.prototype.initialize.call(this, options);
        }

    });

    return View;
});