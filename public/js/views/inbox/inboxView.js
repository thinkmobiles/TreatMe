'use strict';

define([
    'views/customElements/ListView',
    'models/inboxModel',
    'collections/inboxCollection',
    'views/inbox/inboxDetailsView',
    'text!templates/inbox/inboxTemplate.html', //TODO: ...
    'text!templates/inbox/inboxListTemplate.html' //TODO: ...
], function (ListView, Model, Collection, InboxDetails, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),
        url         : '#inbox',

        events: _.extend({
            //put events here ...
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Inbox', path: '#inbox'}]);
            App.menu.select('#nav_inbox');
            ListView.prototype.initialize.call(this, options);
        },

        deleteCurrentItem: function (e) {
            var self = this;

            e.stopPropagation();

            this.removeConfirm({
                onConfirm: function () {
                    var target = $(e.target);
                    var tr = target.closest('tr');
                    var id = tr.data('id');
                    var model = self.collection.get(id);

                    $("#dialog").dialog('close');
                    model.destroy({
                        success: function () {
                            alert('success');
                        },
                        error: self.handleModelError
                    });
                }
            });
        }

    });

    return View;
});