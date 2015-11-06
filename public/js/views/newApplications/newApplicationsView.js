'use strict';

define([
    'views/customElements/ListView',
    'collections/stylistCollection',
    'text!templates/newApplications/newApplicationsTemplate.html',
    'text!templates/newApplications/newApplicantItemTemplate.html',
    'text!templates/newApplications/itemTemplate.html'

], function (ListView, StylistCollection, MainTemplate, ContentTemplate, ItemTemplate) {

    var View;

    View = ListView.extend({

        //el: '#wrapper',
        Collection: StylistCollection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ContentTemplate),
        itemTemplate: _.template(ItemTemplate),

        navElement: '#newApplications',
        query: {status: 'requested'},

        events: {
            "click #acceptCurrentBtn, #acceptSelectedBtn": "acceptStylist",
            "click #removeCurrentBtn, #removeSelectedBtn": "deleteRequest",
            "click .date, .name, .salon": "sort",
            "click .table td": "showDetails",
            "click .checkAll": "checkAll"
        },

        initialize: function () {

            App.Breadcrumbs.reset([{name: 'New Applicants', path: '#newApplications'}]);
            ListView.prototype.initialize.call(this);

        },

        acceptStylist: function (e) {
            var el = e.target;
            var self = this;
            var checkboxes;
            var modelId;
            var models = [];
            var data = {
                ids: []
            };

            if (el.id === 'acceptCurrentBtn') {
                modelId = $(el).closest('tr').attr('data-id');
                data.ids.push(modelId);
                models.push(self.collection.get(modelId));
                data = JSON.stringify(data);

            } else if (el.id === 'acceptSelectedBtn') {
                checkboxes = $(':checkbox:checked:not(\'.checkAll\')');

                $(checkboxes).each(function (index, element) {
                    modelId = $(element).closest('tr').attr('data-id');
                    models.push(self.collection.get(modelId));
                    data.ids.push(modelId);
                });

                data = JSON.stringify(data);
            }

            self.collection.approve(data, function () {
                self.collection.remove(models)
            })
        },

        deleteRequest: function (e) {
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
        },

        showDetails: function (e) {
            var element = $(e.target);
            var id;

            if (!element.closest('td').children().length) {
                id = element.closest('tr').attr('data-id');
                window.location.hash = 'newApplications/' + id;
            }

            return this;
        }

    });

    return View;
});
