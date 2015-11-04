'use strict';

define([
    'collections/stylistCollection',
    'views/customElements/paginationView',
    'text!templates/stylists/stylistsTemplate.html',
    'text!templates/stylists/stylistsListTemplate.html'

], function (StylistCollection, PaginationView, MainTemplate, ListTemplate) {

    var View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),
        listTemplate : _.template(ListTemplate),

        events: {
        },

        initialize: function () {
            var collection = new StylistCollection();
            var self = this;
            var paginationOptions;

            App.Breadcrumbs.reset([{name: 'Stylist List', path: '#stylists'}]);
            self.render();

            paginationOptions = {
                collection    : collection,
                onPage        : 10,
                padding       : 2,
                page          : 1,
                ends          : true,
                steps         : true,
                url           : 'stylists/page',
                urlPagination : collection.url()//,
            };

            this.paginationView = new PaginationView(paginationOptions);

            self.collection = collection;
            collection.on('reset', function () {
                self.renderList();
            });
        },

        render: function () {
            this.$el.html(this.mainTemplate());

            return this;
        },

        renderList: function () {
            var users = this.collection.toJSON();

            //this.$el.find('.list').html(this.listTemplate({users: users}));

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
