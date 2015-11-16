'use strict';

define([
    'views/menu/leftSideMenuView',
    'text!templates/menu/topBarTemplate.html',
    //'text!templates/menu/leftBarTemplate.html',
    //'views/menu/iWantToView',
    //'views/menu/contactUsView',
    'constants/roles'
], function (LeftMenu, TopTemplate, /*LeftTemplate,*/ /*WantView, ContactView,*/ ROLES) {

    var View;
    View = Backbone.View.extend({

        el: '#topMenu',

        events: {
            'click #buttonLogout'   : 'logout',
            'click #middleTopBar'   : 'showWantForm',
            'click #leftTopBar'     : 'showContactUsForm'
        },

        initialize: function () {

            App.Breadcrumbs = new Backbone.Collection();

            this.listenTo(App.Breadcrumbs, 'reset', this.renderBreadcrumbs);
            this.listenTo(App.sessionData, 'change:authorized', this.render);
        },

        logout: function () {
            var self = this;

            $.ajax({
                url  : "/signOut",
                type : "GET",

                success: function () {
                    $('body').removeClass('loggedState');

                    App.Events.trigger('logout');
                    App.sessionData.set({
                        authorized : false,
                        companyId  : null,
                        userId     : null
                    });
                    App.router.navigate("login", {trigger: true});
                },
                error: function (err) {
                    self.handleErrorResponse(err);
                }
            });
        },

        render: function () {
            var data = App.sessionData.toJSON();

            this.$el.html(_.template(TopTemplate)(data));
            this.leftMenu = new LeftMenu();

            return this;
        },

        renderBreadcrumbs: function () {
            var collection = App.Breadcrumbs;
            var container = this.$el.find('#breadcrumbContainer');
            var items = collection.toJSON();
            var lastIndex = items.length - 1;
            var links = _.map(items, function ( item, i ) {
                var class_ = 'breadcrumb';

                if (i === lastIndex) {
                    class_ += ' active';
                }

                return '<a href="' + item.path + '" class="' + class_ + '">' + item.name + '</a>';
            });
            var htmlContent = links.join('<span class="breadcrumbSeparator"> </span>');

            container.html(htmlContent);

            return this;
        }

    });
    return View;
});
