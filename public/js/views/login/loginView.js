'use strict';

define([
    'text!templates/login/loginTemplate.html',
    'validation'

], function (LoginTemplate, validation) {

    var View = Backbone.View.extend({

        el : '#wrapper',

        typicalLogin : _.template(LoginTemplate),

        initialize: function (option) {
            if (option && option.type){
                this.token = option.type==='token' && option.value ? option.value : false;
                this.successUrl = option.type==='success' && option.value ? option.value : false;
            }

            this.setDefaultData();
            this.listenTo(this.stateModel, 'change', this.render);

            this.render();
        },

        events: {
            "click #loginButton"        : "login",
            "focusin .form-field>input" : "clearField"
        },

        setDefaultData: function () {
            var defaultData = {
                email       : '',
                password    : '',
                errorObject : false
            };

            this.stateModel = new Backbone.Model(defaultData);
        },

        login: function (event) {
            event.stopImmediatePropagation();
            event.preventDefault();

            var self = this;
            var thisEl = this.$el;
            var data;
            var currentUrl = "/signIn";
            var errorObject = {};

            var stateModelUpdate = {
                errorObject: false,
                password   : thisEl.find("#loginPass").val().trim()
            };

            if (!this.token){
                stateModelUpdate.email = thisEl.find("#loginEmail").val().trim();
                validation.checkEmailField(errorObject, stateModelUpdate.email, 'email');
                data = {
                    email      : stateModelUpdate.email,
                    password   : stateModelUpdate.password,
                    role : 'Admin'
                }
            } else {
                currentUrl += "/"+this.token;
                data = {
                    password   : stateModelUpdate.password,
                    role : 'Admin'
                }
            }

            validation.checkPasswordField(errorObject, stateModelUpdate.password, 'password');

            if (errorObject.email || errorObject.password) {
                stateModelUpdate.errorObject = errorObject;
                this.stateModel.set(stateModelUpdate);
                return this;
            }

            $.ajax({
                url      : currentUrl,
                type     : "POST",
                dataType : 'json',
                data     : data,
                success: function (res) {
                    var userInfo = {};
                    userInfo.authorized = true;
                    userInfo.userId  = res.id;
                    userInfo.role  = 'Admin';

                    $('body').addClass('loggedState');

                    App.sessionData.set(userInfo);

                    App.router.navigate(self.successUrl ? self.successUrl : "users", {trigger: true});
                    self.stateModel.set({
                        password    : '',
                        email       : '',
                        errorObject : false
                    });
                    App.Events.trigger('authorized');
                },
                error: function (err) {
                    App.sessionData.set({
                        authorized : false,
                        userId     : null
                    });

                    self.stateModel.set({
                        //errors     : [err.responseJSON.error],
                        password   : null
                    });
                }
            });

            return this;
        },

        clearField: function(event){
            var targetContainer = $(event.target).closest('.form-field');
            targetContainer.find('input').removeClass('error_input');
            targetContainer.find('.error_msg').hide();
        },

        render: function () {
            var thisEl = this.$el;
            var tempModel = this.stateModel.toJSON();

            tempModel.isInvite = false;

            if (this.token) {
                tempModel.isInvite = true;
            }
            thisEl.html(this.typicalLogin(tempModel));

            return this;
        }

    });

    return View;

});