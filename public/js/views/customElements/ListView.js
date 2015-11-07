'use strict';

define([
    'text!templates/customElements/mainTemplate.html'
], function (MainTemplate) {
    var View = Backbone.View.extend({

        el: '#wrapper',

        listLength        : null,
        defaultItemsNumber: null,
        newCollection     : null,
        $pagination       : null,

        mainTemplate: _.template(MainTemplate),
        listTemplate: null,
        Collection  : null,
        navElement  : '#nav_dashborad',
        defaults    : {
            page  : 1,
            count : 10,
            order : '1',
            filter: ''
        },

        initialize: function (options) {
            var opts = options || {};
            var Collection = this.Collection;
            var defaults = this.defaults;
            var self = this;
            var params;

            params = {
                page  : opts.page || defaults.page,
                count : opts.countPerPage || defaults.count,
                filter: opts.filter || defaults.filter
            };

            if (opts.orderBy) {
                params.orderBy = opts.orderBy;
                params.order = opts.order || defaults.order;
            }

            this.pageParams = params;
            console.log(this.pageParams);

            this.render();

            this.collection = new Collection(this.pageParams);
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
            var navContainer = $('.sidebar-menu');
            var navElement = this.navElement;
models[0].toJSON().data;

            this.$el.find('.table tbody').html(this.listTemplate({users: items}));

            return this;
        }

    });

    return View;
});
