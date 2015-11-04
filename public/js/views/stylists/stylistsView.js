'use strict';

define([
    'collections/stylistCollection',
    'text!templates/stylists/stylistsTemplate.html'

], function (StylistCollection, MainTemplate) {

    var View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),

        events: {
        },

        initialize: function () {
            var collection = new StylistCollection();
            var self = this;

            App.Breadcrumbs.reset([{name: 'Stylist List', path: '#stylists'}]);

            self.collection = collection;
            collection.on('reset', function () {
                console.log('>>> reset');
                console.log(collection);
                self.render();
            });
        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var users = self.collection.toJSON();

            console.log(users);

            $el.html(self.mainTemplate({users: users}));

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
