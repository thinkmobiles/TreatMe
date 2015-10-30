/**
 * Created by andrey on 17.07.15.
 */

define([
    'text!templates/menu/topBarTemplate.html',
    'text!templates/menu/leftBarTemplate.html',
    //'views/menu/iWantToView',
    //'views/menu/contactUsView',
    'constants/roles'
], function (TopTemplate, LeftTemplate, /*WantView, ContactView,*/ ROLES) {

    var View;
    View = Backbone.View.extend({

        el: '#topMenu',

        events: {
            'click #buttonLogout'   : 'logout',
            'click #profileTop'     : 'showPofile',
            'click #middleTopBar'   : 'showWantForm',
            'click #leftTopBar'     : 'showContactUsForm'
        },

        initialize: function () {
            this.listenTo(App.sessionData, 'change:authorized', this.render);
            this.listenTo(App.sessionData, 'change:first_name change:last_name change:avatar', this.renderUser);
            this.listenTo(App.Badge,       'change:pendingUsers', this.updatePendingUsersBadge);
        },

        logout: function () {
            var self = this;

            $.ajax({
                url  : "/signOut",
                type : "POST",

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
                    self.errorNotification(err);
                }
            });
        },

        render: function () {
            var data = App.sessionData.toJSON();

            this.$el.html(_.template(TopTemplate)(data));

            if (data.authorized) {
                $('#leftMenu').html(_.template(LeftTemplate));
            }

            return this;
        },

        renderUser: function () {
            var authorized = App.sessionData.get('authorized');
            var user = App.sessionData.get('first_name') +' '+ App.sessionData.get('last_name');

            this.$el.find('.userName').html(user);
        }

    });
    return View;
});
