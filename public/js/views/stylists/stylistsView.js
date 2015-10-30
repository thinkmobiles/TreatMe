'use strict';

define([
    'text!templates/stylists/stylistsTemplate.html'

], function (MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function () {
            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;

            $el.html(self.mainTemplate());

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
