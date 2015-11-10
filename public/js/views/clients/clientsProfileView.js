'use strict';

define([
    'models/clientModel',
    'text!/templates/clients/clientsProfileView.html'
], function (clientModel, ClientProfile) {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          

    var View = Backbone.View.extend({
        el: '#wrapper',

        template: _.template(ClientProfile),

        events: {
        },

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Client profile', path: '#profile'}]);
            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;

            $el.html(self.template());

            return this;
        }
    });

    return View;
});