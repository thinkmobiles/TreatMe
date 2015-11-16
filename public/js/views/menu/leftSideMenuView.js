'use strict';

define([
    'text!templates/menu/leftBarTemplate.html'
], function (Template) {

    var View = Backbone.View.extend({

        mainTemplate: _.template(Template),
        el: '#leftMenu',

        events: {
        },

        initialize: function () {
            var data = App.sessionData.toJSON();

            App.menu = this;

            if (data.authorized) {
                this.render();
            }
        },

        render: function () {
            this.$el.html(this.mainTemplate());
            return this;
        },

        select: function(navElement) {
            var navContainer = this.$el.find('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find(navElement).addClass('active');
        }

    });
    return View;
});
