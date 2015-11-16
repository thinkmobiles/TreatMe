'use strict';

define([
    'text!templates/gallery/galleryTemplate.html'

], function (MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function () {
            App.Breadcrumbs.reset([{name: 'Gallery', path: '#gallery'}]);
            App.menu.select('#nav_gallery');

            this.render();
        },

        render: function () {
            var self = this;
            var $el = self.$el;

            $el.html(self.mainTemplate());

            return this;
        }

    });

    return View;
});
