'use strict';

define([
    'custom',
    'views/customElements/ListView',
    'models/serviceModel',
    'collections/serviceCollection',
    'text!templates/services/servicesTemplate.html', //TODO: ...
    'text!templates/services/servicesListTemplate.html' //TODO: ...
], function (custom, ListView, Model, Collection, MainTemplate, ListTemplate) {

    var View = ListView.extend({
        Collection: Collection,
        mainTemplate: _.template(MainTemplate),
        listTemplate: _.template(ListTemplate),

        events: _.extend({
            //put events here ...
            'click .editBtn'         : 'edit',
            'click .saveBtn'         : 'save',
            'click .cancelBtn'       : 'cancel',
            'click .add'             : 'add',
            'click .logo'            : 'changeLogo',
            'change .changeLogo'     : 'changeInputFile'
        }, ListView.prototype.events),

        initialize: function (options) {
            App.Breadcrumbs.reset([{name: 'Services', path: '#services'}]);
            App.menu.select('#nav_services');
            ListView.prototype.initialize.call(this, options);
        },

        showItem: function (e) {
            var target = $(e.target);
            var itemId = target.closest('tr').data('id');
        },


        edit: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            var id = tr.data('id');

            if (id) {
                var model = this.collection.get(id);
                var modelJSON = model.toJSON();

                tr.find('.name').html('<input class="newName" value="'+modelJSON.name+'">');
                tr.find('.discount').html('<input class="newDiscount" value="'+modelJSON.price+'">');
                tr.find('.editBtn').remove();
                tr.find('.removeCurrentBtn').remove();

                tr.find('.editOrSave').html('<button class="saveBtn">Save</button>');
                tr.find('.removeOrCancel').html('<button class="cancelBtn">Canсel</button>');
            } else if (!id) {
                tr.remove();
            }
            this.$el.find('.add').remove();

            e.stopPropagation();

        },

        save: function (e) {
            var self = this;
            var target = $(e.target);
            var tr = target.closest('tr');
            var id = tr.data('id');
            var logo = tr.find('.logo');
            var error = false;
            var data;
            var model;
            var name;
            var discount;
            var logoBASE64;

            if (id) {
                model = this.collection.get(id);
            }

            name = tr.find('.newName').val();
            discount = tr.find('.newDiscount').val();
            logoBASE64 = tr.find('.logo').attr('src');

            tr.find('.prompt').remove();

            if (logo.data('changed')) {
                logoBASE64 = logo.attr('src');
            } else {
                logoBASE64 = null;
            }

            if (!name) {
                tr.find('.name').append('<span class="prompt">Please fill Service Name field</span>');
                error = true;
            }

            if (!discount) {
                tr.find('.discount').append('<span class="prompt">Please fill Discount field</span>');
                error = true;
            }

            if (error === true) {
                return;
            }

            data = {
                name     : name,
                price    : discount,
                logo     : logoBASE64
            };

            if (!id) {
                model = new Model(data);
            }

            model.save(data, {
                success: function (savedModel, res) {
                    var success = res.responseJSON ? res.responseJSON.success : 'Service created successfully!';
                    App.notification({message: success, type: 'success'});
                    if (!id) {
                        self.collection.add(savedModel);
                        tr.attr('data-id', savedModel.id);
                    }
                    tr.find('.cancelBtn').click();
                },
                error: function (model, res) {
                    var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                    App.notification(err);
                }


            });

        },

        cancel: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            var id = tr.data('id');

            if (id) {
                var model = this.collection.get(id);
                var modelJSON = model.toJSON();

                tr.find('.name').html(modelJSON.name);
                tr.find('.discount').html(modelJSON.price);
                tr.find('.newDiscount').remove();
                tr.find('.saveBtn').remove();
                tr.find('.cancelBtn').remove();

                tr.find('.editOrSave').html('<button class="editBtn"></button>');
                tr.find('.removeOrCancel').html('<button class="removeCurrentBtn delete"></button>');
            } else if (!id) {
                tr.remove();
            }
            this.$el.find('.buttons').html('<button class="add">Add New Service</button>');

            e.stopPropagation();
        },

        add: function (e) {
                this.$el.find('.items').prepend('<tr>' +
                '<td ><img class="logo" width="90" height="90" alt="logo" src="<%= item.logo %>"/>' +
                    '<input style="display: none" type="file" value="Logo" class="changeLogo" accept="image/*"><br/></td>' +
                '<td class="name"><input class="newName"></td>' +
                '<td class="discount"><input class="newDiscount"></td>' +
                '<td class="editOrSave"><button class="saveBtn">Save</button></td>' +
                '<td class="removeOrCancel"><button class="cancelBtn">Canсel</button></td></tr>');

            this.$el.find('.add').remove();

            e.stopPropagation();

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
                        success: function (model, res) {
                            var success = res.responseJSON ? res.responseJSON.success : 'Service removed successfully!';
                            App.notification({message: success, type: 'success'});

                        },
                        error: function (model, res) {
                            var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                            App.notification(err);
                        }
                    });
                }
            });
        },

        changeLogo: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            tr.find('.changeLogo').click();
        },

        changeInputFile: function (e) {
            var target = $(e.target);
            var tr = target.closest('tr');
            var logo = tr.find('.logo');
            var self = this;

            custom.getSrc(e, function (err, src) {
                if (err) {
                    return function (model, res) {
                        var err = res.responseJSON ? res.responseJSON.message : 'Something broke!';

                        App.notification(err);
                    };
                }

                logo.attr('src', src);
                logo.attr('data-changed', 'true');
            });

        }
    });

    return View;
});
