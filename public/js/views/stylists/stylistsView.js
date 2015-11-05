'use strict';

define([
    'constants/index',
    'collections/stylistCollection',
    'views/customElements/paginationView',
    'text!templates/stylists/stylistsTemplate.html',
    'text!templates/stylists/stylistsListTemplate.html'

], function (CONSTANTS, StylistCollection, PaginationView, MainTemplate, ListTemplate) {

    var View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),
        listTemplate : _.template(ListTemplate),

        events: {
        },

        initialize: function (options) {
            var page = (options && options.page) ? parseInt(options.page) : 1;
            var collectionParams = {
                page: page
            };
            var collection = new StylistCollection(collectionParams);
            var self = this;
            var paginationOptions;

            App.Breadcrumbs.reset([{name: 'Stylist List', path: '#stylists'}]);
            self.render();

            paginationOptions = {
                collection    : collection,
                onPage        : CONSTANTS.ITEMS_PER_PAGE,
                padding       : 2,
                page          : page,
                ends          : true,
                steps         : false,
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

            this.$el.find('.list').html(this.listTemplate({users: users}));

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
