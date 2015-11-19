'use strict';

define([
    'views/customElements/ListView',
    'collections/stylistCollection',
    'text!templates/stylists/stylistsTemplate.html',
    'text!templates/stylists/stylistsListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        //navElement: '#nav_stylists',
        url: '#stylists',

        events: _.extend({
            //put events here ...
            'click .edit': 'gotoEdit'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Stylist List', path: '#stylists'}]);
            App.menu.select('#nav_stylists');

            ListView.prototype.initialize.call(this, options);
        },

        gotoEdit: function (e) {
            var target = $(e.target);
            var itemId = target.closest('tr').data('id');
            var url = this.url + '/' + itemId + '/edit';

            e.stopPropagation();

            Backbone.history.navigate(url, {trigger: true});
        }
    });

    return View;
});