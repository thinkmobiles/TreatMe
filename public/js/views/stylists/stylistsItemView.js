'use strict';

define([
    'text!templates/stylists/itemTemplate.html'

], function (MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function (options) {
            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var user = {}; //new user

            $el.html(self.mainTemplate({user: user}));

            return this;
        },

        afterRender: function (){
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_stylists').addClass('active')
        }

    });

    return View;
});
