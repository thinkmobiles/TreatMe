'use strict';

define([
    'models/clientModel',
    'text!templates/client/clientAddTemplate.html'
], function (ClientModel, ClientAddTemplate) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        ClientAddTemplate: _.template(ClientAddTemplate),

        events: {
        },

        initialize: function (options) {
            var self = this;
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var user = self.model.toJSON();

            console.log(user);
            $('.searchBlock').html('');
            $el.html(self.mainTemplate({user: user}));

            return this;
        }

    });

    return View;
});