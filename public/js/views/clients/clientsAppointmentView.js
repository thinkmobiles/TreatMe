'use strict';

define([
    'views/customElements/ListView',
    'models/clientModel',
    'collections/clientsCollection',
    'text!/templates/clients/clientsAppointmentTemplate.html',
    'text!/templates/clients/clientsAppointmentListTemplate.html'
], function (ListView, Model, Collection, ClientAppointment, ClientListAppointment) {
    var View = ListView.extend({
        el: '#clientsAppointment',

        Collection: Collection,
        mainTemplate: _.template(ClientAppointment),
        listTemplate: _.template(ClientListAppointment),

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            console.log(options);
            ListView.prototype.initialize.call(this, options);
        }

    });

    return View;
});