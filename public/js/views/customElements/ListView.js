'use strict';

define([
    'constants/index',
    'views/customElements/paginationView',
    'text!templates/customElements/mainTemplate.html'

], function (CONSTANTS, PaginationView, MainTemplate) {

    var View = Backbone.View.extend({

        el : '#wrapper',

        mainTemplate : _.template(MainTemplate),
        listTemplate : null,
        url: null,
        Collection: null,
        navElement: '#nav_dashborad',

        events: {
        },

        initialize: function (options) {
            var page = (options && options.page) ? parseInt(options.page) : 1;
            var collectionParams = {
                page: page
            };
            var self = this;
            var Collection = this.Collection;
            var paginationOptions;

            this.collection = new Collection(collectionParams);

            self.render();

            paginationOptions = {
                collection    : self.collection,
                onPage        : CONSTANTS.ITEMS_PER_PAGE,
                padding       : 2,
                page          : page,
                ends          : true,
                steps         : false,
                url           : self.url,//'stylists/page',
                urlPagination : self.collection.url()
            };

            this.paginationView = new PaginationView(paginationOptions);

            this.collection.on('reset', function () {
                self.renderList();
            });
        },

        render: function () {
            this.$el.html(this.mainTemplate());

            return this;
        },

        renderList: function () {
            var items = this.collection.toJSON();

            this.$el.find('.list').html(this.listTemplate({users: items}));

            return this;
        },

        afterRender: function (){
            var navContainer = $('.sidebar-menu');
            var navElement = this.navElement;

            navContainer.find('.active').removeClass('active');
            navContainer.find(navElement).addClass('active')
        }

    });

    return View;
});
