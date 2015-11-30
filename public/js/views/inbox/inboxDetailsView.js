'use strict';

define([
    'models/inboxModel',
    'collections/inboxCollection',
    'text!templates/inbox/inboxDetailsTemplate.html'
], function (Model, Collection,  MainTemplate) {

    var View = Backbone.View.extend({
        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
        },

        initialize: function (options) {
            var self = this;
            var model;

            if (options && options.id) {
                model = new Model({_id: options.id});
                model.fetch({
                    success: function (inboxModel) {
                        var name = inboxModel.get('name');

                        self.model = inboxModel;

                        App.Breadcrumbs.reset([{
                            name: 'Inbox', path: '#inbox'}, {
                            name: name,
                            path: '#inbox/:id'
                        }]);
                        self.renderInbox();
                    },
                    error  : function (model, res) {
                        var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                        App.notification(err);
                    }
                });
            } else {
                model = new Model();
                this.model = model;
                this.render();
            }

            this.render();
        },

        render: function () {
            this.$el.html(this.mainTemplate());
            return this;
        },

        renderInbox: function () {
            var model = this.model;
            var $el = this.$el;
            var container = $el.find('.inboxForm');
            var item = model.toJSON();

            $el.find('.inboxName').html(item.name);
            $el.find('.createdAt').html(item.createdAt);

            container.find('.name').html(item.name);
            container.find('.email').html(item.email);
            container.find('.subject').html(item.subject);
            container.find('.message').html(item.message);
        },

       /* deleteCurrentItem: function (e) {
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
        }*/
    });

    return View;
});