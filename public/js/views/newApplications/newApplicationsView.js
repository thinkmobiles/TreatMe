'use strict';

define([
    'views/customElements/ListView',
    'collections/stylistCollection',
    'text!templates/newApplications/newApplicantListTemplate.html',
    'text!templates/newApplications/newApplicationsTemplate.html',
    'text!templates/newApplications/itemTemplate.html'

], function (ListView, StylistCollection, ListTemplate, MainTemplate, ItemTemplate) {

    var View = ListView.extend({

        Collection  : StylistCollection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        itemTemplate: _.template(ItemTemplate),
        url         : '#newApplications',
        query       : {
            status: 'requested'
        },
        removeConfirmMessage: 'Are You sure want to delete this profile(s)?',

        events: _.extend({
            "click .acceptCurrentBtn" : "acceptStylist",
            "click #acceptSelectedBtn": "acceptStylists",
            "click .removeCurrentBtn" : "deleteStylist",
            "click #removeSelectedBtn": "deleteStylists"
        }, ListView.prototype.events),

        initialize: function (options) {
            var opts = options || {};

            opts.status = 'requested';

            App.Breadcrumbs.reset([{name: 'New Applications', path: '#newApplications'}]);
            App.menu.select('#nav_new_applications');

            ListView.prototype.initialize.call(this, opts);
        },

        acceptStylist: function (e) {
            var target = $(e.target);
            var id = target.closest('tr').data('id');
            var ids = [id];

            e.stopPropagation();

            this.accept(ids);
        },

        acceptStylists: function (e) {
            var ids = this.getSelectedIds();

            this.accept(ids);
        },

        accept: function (ids) {
            var self = this;

            this.collection.acceptRequest({
                data   : JSON.stringify({ids: ids}),
                success: function () {
                    self.collection.remove(ids);
                }
            });
        },

        deleteStylist: function (e) {
            var target = $(e.target);
            var id = target.closest('tr').data('id');
            var ids = [id];

            e.stopPropagation();

            this.deleteRequest(ids);
        },

        deleteStylists: function () {
            var ids = this.getSelectedIds();

            this.deleteRequest(ids);
        },

        deleteRequest: function (ids) {
            console.log('>>> delete request');
        },

        deleteRequest__: function (e) {
            var el = e.target;
            var self = this;
            var checkboxes;
            var modelId;
            var models = [];
            var data = {
                ids: []
            };

            if (el.id === 'removeCurrentBtn') {
                modelId = $(el).closest('tr').attr('data-id');
                data.ids.push(modelId);
                models.push(self.collection.get(modelId));
                data = JSON.stringify(data);

            } else if (el.id === 'removeSelectedBtn') {
                checkboxes = $(':checkbox:checked:not(\'.checkAll\')');

                $(checkboxes).each(function (index, element) {
                    modelId = $(element).closest('tr').attr('data-id');
                    data.ids.push(modelId);
                });

                data = JSON.stringify(data);
            }

            self.collection.deleteRequest(data, function () {
                self.collection.remove(models);
            })
        }

    });

    return View;
});
