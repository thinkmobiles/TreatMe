'use strict';

define([
    'collections/stylistCollection',
    'text!templates/newApplications/newApplicationsTemplate.html'

], function (StylistCollection, MainTemplate) {

    var View;

    View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click #acceptCurrentBtn, #acceptSelectedBtn": "acceptStylist",
            "click #removeCurrentBtn, #removeSelectedBtn": "deleteRequest",
            "click .date": "sort",
            "click .checkAll": "checkAll"
        },

        initialize: function () {
            var self = this;

            self.collection = new StylistCollection({status: 'requested'});
            self.collection.on('remove', self.reRender, self);


            self.collection.fetch({
                reset: true,
                data: {status: 'requested'},
                success: function (coll) {
                    self.collection = coll;
                    self.render();
                }
            });

        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var users = self.collection.toJSON();

            $el.html(self.mainTemplate({users: users}));

            return this;
        },

        afterRender: function () {
            var navContainer = $('.sidebar-menu');

            navContainer.find('.active').removeClass('active');
            navContainer.find('#nav_new_applications').addClass('active')
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

        checkAll: function () {
            var state = $('.checkAll').prop('checked');
            var checkboxes = $(':checkbox:not(\'.checkAll\')');

            state
                ? checkboxes.prop('checked', true)
                : checkboxes.prop('checked', false);
        },

        reRender: function () {
            console.log('fire event remove');
            this.initialize();
            //var self = this;
            //var $el = self.$el;
            //var users = self.collection.toJSON();
            //
            //$el.html('');
            //$el.html(self.mainTemplate({users: users}));
            //
            //return this;
        },

        sort: function (e) {
            var curElement = $(e.target);

            curElement.hasClass('asc')
                ? curElement.removeClass('asc')
                : this.ascendingSort(curElement)

        },

        ascendingSort: function (el) {
            var self = this;
            var sort = el.attr('class');
            var sortOrder = 1;
            var table = $('.table tbody');
            el.addClass('asc');

            self.collection.fetch({
                reset: true,
                data: {
                    status: 'requested',
                    sort: sort,
                    order: sortOrder
                },
                success: function (coll) {
                    self.collection = coll;
                    table.html('');
                    coll.forEach(function (applicant) {
                    table.append(
                       + '<tr data-id="' + applicant._id +'">'
                       + '<td><div class="checkBlock"><input type="checkbox" class="check"></div></td>'
                       + '<td>' + new Date(applicant.createdAt).getDate() + '/' + new Date(applicant.createdAt).getMonth() + '/' + String.prototype.slice.call(new Date(applicant.createdAt).getFullYear(),2,4) + '</td>'
                       + '<td>' + applicant.firstName + '\s' + applicant.lastName + '</td>'
                       + '<td>' + applicant.salonName + '</td>'
                       + '<td><button id="acceptCurrentBtn">Accept</button></td>'
                       + '<td><button id="removeCurrentBtn">Delete</button></td>'
                       + '</tr>')
                    });

                    self.render();
                }
            });

        }

    });

    return View;
});
