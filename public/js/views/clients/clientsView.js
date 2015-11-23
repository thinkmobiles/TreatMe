'use strict';

define([
    'views/customElements/ListView',
    'collections/clientsCollection',
    'views/clients/clientsProfileView',
    'views/clients/clientsAddAndEditView',
    'text!/templates/clients/clientsTemplate.html',
    'text!/templates/clients/clientsListTemplate.html'
], function (ListView, Collection, ClientProfile, NewClients, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection  : Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        url       : '#clients',

        events: _.extend({
            //put events here ...
            'click .item'     : 'showProfile',
            'click #addClient': 'addClient',
            'click .editBtn'  : 'edit',
            'click .suspendCurrentBtn': 'suspendClient',
            'click #suspendBtn': 'suspendClients'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Clients List', path: '#clients'}]);
            App.menu.select('#nav_clients');

            ListView.prototype.initialize.call(this, options);
        },

        addClient: function () {
            Backbone.history.navigate('clients/add', {trigger: true});
        },

        edit: function (e) {
            var target = $(e.target);
            var id = target.closest('tr').data('id');
            var url = 'clients/' + id + '/edit';

            e.stopPropagation();

            Backbone.history.navigate(url, {trigger: true});
        },

        suspendClient: function (e) {
            var target = $(e.target);
            var id = target.closest('tr').data('id');
            var ids = [id];

            e.stopPropagation();

            this.suspend(ids);
        },

        suspendClients: function () {
            var ids = this.getSelectedIds();

            this.suspend(ids);
        },

        suspend: function (ids) {
            this.collection.suspendRequest({
                data   : JSON.stringify({ids: ids}),
                success: function () {
                    self.collection.remove(ids);
                }
            });
        },
    });

    return View;
});