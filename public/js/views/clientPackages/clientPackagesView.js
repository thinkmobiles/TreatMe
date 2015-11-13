'use strict';

define([
    'views/customElements/ListView',
    'collections/clientPackagesCollection',
    'text!templates/clientPackages/clientPackagesTemplate.html',
    'text!templates/clientPackages/clientPackagesListTemplate.html'
], function (ListView, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        navElement: '#nav_client_packages',
        url: '#clientPackages',

        events: _.extend({
            //put events here ...
            'click #removeSelectedBtn': 'deleteAllPackages',
            'click .deleteCurrentBtn': 'deleteCurrentPackage'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Client Packages', path: '#clientPackages'}]);

            ListView.prototype.initialize.call(this, options);
        },

        deleteAllPackages: function (e) {
            var ids = this.getSelectedIds();

            this.deletePackages(ids);
        },

        deleteCurrentPackage: function (e) {
            var target = $(e.target);
            var itemId = target.closest('tr').data('id');
            var ids = [itemId];

            this.deletePackages(ids);
        },

        deletePackages: function (ids) {
            var data = {
                packagesArray: ids
            };
            var dataStr = JSON.stringify(data);
            var self = this;

            $.ajax({
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                url: 'admin/packages',
                data: dataStr,
                success: function () {
                    var params = self.pageParams;
                    var page = params.page;
                    var fetchParams = _.extend({reset: true}, params);

                    self.collection.getPage(page, fetchParams); //fetch and re-render
                },
                error: self.handleErrorResponse //TODO
            });
        }
    });

    return View;
});