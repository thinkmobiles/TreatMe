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
        query: null,
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

            this.collection.on('remove', function () {
                self.refreshContent();
            })
        },

        render: function () {
            this.$el.html(this.mainTemplate());

            return this;
        },

        renderList: function () {
            var items = this.collection.toJSON();

            //this.$el.find('.list').html(this.listTemplate({users: items}));
            this.$el.find('.table tbody').html(this.listTemplate({users: items}));

            return this;
        },

        reRenderList: function () {
            var items = this.collection.toJSON();
            var element = this.$el.find('.table tbody');

            element.html('');
            element.html(this.listTemplate({users: items}));

            return this;
        },

        refreshContent: function () {
            var self = this;

            self.collection.fetch({
                reset: true,
                data: self.query,
                success: function (coll) {
                    self.collection = coll;
                    self.reRenderList();
                }
            });

            return this;
        },

        sort: function (e) {
            var curElement = $(e.target);

            curElement.hasClass('asc')
                ? this.sorting(curElement, -1)
                : this.sorting(curElement, 1)

        },

        sorting: function (el, sortOrder) {
            var self = this;
            var sort = el.attr('class');

            sortOrder === 1
                ? el.addClass('asc')
                : el.removeClass('asc');

            self.query.sort = sort;
            self.query.order = sortOrder;

            self.refreshContent();

        },

        afterRender: function (){
            var navContainer = $('.sidebar-menu');
            var navElement = this.navElement;

            navContainer.find('.active').removeClass('active');
            navContainer.find(navElement).addClass('active')
        },

        checkAll: function () {
            var state = $('.checkAll').prop('checked');
            var checkboxes = $(':checkbox:not(\'.checkAll\')');

            state
                ? checkboxes.prop('checked', true)
                : checkboxes.prop('checked', false);
        }

    });

    return View;
});