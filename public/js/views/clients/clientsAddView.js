'use strict';

define([
    'models/clientModel',
    'text!templates/clients/newClientsTemplate.html'
], function (ClientModel, ClientAddTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        ClientAddTemplate: _.template(ClientAddTemplate),

        events: {
        },

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}, {name: 'Add client', path: '#client/add'}]);
            this.render();
        },

        render: function(){
            this.$el.html(this.ClientAddTemplate());

            return this;
        }

    });

    return View;
});