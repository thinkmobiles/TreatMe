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
            "click .checkAll": "checkAll"
        },

        initialize: function () {
            var self = this;

            self.collection = new StylistCollection();
            self.collection.fetch({
                reset: true,
                data: { status: 'requested' },
                success: function (coll) {
                    self.collection = coll;
                    self.render();
                }
            });
            //self.collection.on('reset', self.render, self);
            self.collection.on('remove', function () {
                console.log('fire event remove')
            }, this);
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
            var data = {
                ids: []
            };

            if (el.id === 'acceptCurrentBtn') {
                data.ids.push($(el).closest('tr').attr('data-id'));
                data = JSON.stringify(data);

            } else if (el.id === 'acceptSelectedBtn') {
                checkboxes = $(':checkbox:checked:not(\'.checkAll\')');

                $(checkboxes).each(function( index, element ) {
                    data.ids.push($(element).closest('tr').attr('data-id'));
                });

                data = JSON.stringify(data);
            }

            self.collection.approve(data, function () {
                self.initialize();
                console.log('approve')
            })
        },

        deleteRequest: function (e) {
            var el = e.target;
            var self = this;
            var checkboxes;
            var data = {
                ids: []
            };

            if (el.id === 'removeCurrentBtn') {
                data.ids.push($(el).closest('tr').attr('data-id'));
                data = JSON.stringify(data);

            } else if (el.id === 'removeSelectedBtn') {
                checkboxes = $(':checkbox:checked:not(\'.checkAll\')');

                $(checkboxes).each(function( index, element ) {
                    data.ids.push($(element).closest('tr').attr('data-id'));
                });

                data = JSON.stringify(data);
            }

            self.collection.deleteRequest(data, function () {
                self.initialize();
                console.log('removed')
            })
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
