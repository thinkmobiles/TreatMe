'use strict';

define([
    'views/menu/topBarView',
    'constants/redirect'
], function (TopMenuView , REDIRECT) {

    var appRouter  = Backbone.Router.extend({

        wrapperView : null,
        topBarView  : null,

        routes: {
            "login(/:type/*value)"      :  "login",
            "signup"                    :  "signup",
            "dashboard"                 :  "dashboard",
            "newApplications"           :  "newApplications",
            "newApplications/add"       :  "newApplicationDetails",
            "newApplications/:id"       :  "newApplicationDetails",
            "stylists"                  :  "stylists",
            "stylists/add"              :  "addStylists",
            "stylists/:id"              :  "stylistDetails",
            "clients"                   :  "clients",
            "pendingRequests"           :  "pendingRequests",
            "bookings"                  :  "bookings",
            "stylistPayments"           :  "stylistPayments",
            "clientPackages"            :  "clientPackages",
            "gallery"                   :  "gallery",

            // "users"                     :  "users",

            /*"settings"                  :  "settings",
            "newUsers"                  :  "newUsers",
            ":docType/preview/:id"      :  "forPreview",
            "templates/:viewType"       :  "templates",
            "signature/:type/:token"    :  "signature",
            "documents/:viewType"       :  "documents",
            "taskList"                  :  "taskList",
            "userProfile"               :  "userProfile",
            "forgotPassword"            :  "forgotPassword",
            "resetPassword/:token"      :  "resetPassword",
            "confirmEmail(/:token)"     :  "confirmEmail",
            "help"                      :  "help",*/
            "*any"                      :  "any"
        },

        initialize: function () {
            new TopMenuView();
        },

        loadWrapperView: function (argName, argParams, argRedirect, argType) {
            var self = this;
            var name = argName;
            var nameView = argType ? name+argType+'View' : name + 'View';
            var params =  argParams;
            var redirect = argRedirect;
            var newUrl;

            if (redirect === REDIRECT.whenNOTAuthorized) {
                if (!App.sessionData.get('authorized')){
                    newUrl = "login/success/" + window.location.hash.slice(1);
                    return Backbone.history.navigate(newUrl , {trigger: true});
                }
            }

            if (redirect === REDIRECT.whenAuthorized) {
                if (App.sessionData.get('authorized')){
                    return Backbone.history.navigate("users", {trigger: true});
                }
            }

            require(['views/'+name+'/'+nameView], function (View) {
                self[nameView] = new View(params);

                if (self.wrapperView) {
                    self.wrapperView.undelegateEvents();
                }

                self.wrapperView = self[nameView];

                if (self.wrapperView.afterRender) {
                    self.wrapperView.afterRender();
                }
            });
        },

        any: function () {
            Backbone.history.navigate("dashboard", {trigger: true});
        },

        login: function (type, value) {
            this.loadWrapperView('login', {type : type, value : value}, REDIRECT.whenAuthorized);
        },

        signup: function () {
            this.loadWrapperView('signup', null, REDIRECT.whenAuthorized);
        },

        confirmEmail: function (token) {
            this.loadWrapperView('confirmEmail',{token : token}, REDIRECT.whenAuthorized);
        },

        forgotPassword: function () {
            this.loadWrapperView('forgotPassword', null, REDIRECT.whenAuthorized);
        },

        resetPassword: function (token) {
            this.loadWrapperView('resetPassword', {token : token}, REDIRECT.whenAuthorized);
        },

        dashboard: function () {
            this.loadWrapperView('dashboard', null, REDIRECT.whenNOTAuthorized);
        },

        newApplications: function () {
            this.loadWrapperView('newApplications', null, REDIRECT.whenNOTAuthorized);
        },

        newApplicationDetails: function (id) {
            this.loadWrapperView('newApplications', {id: id}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        stylists: function () {
            this.loadWrapperView('stylists', null, REDIRECT.whenNOTAuthorized);
        },

        clients: function () {
            this.loadWrapperView('clients', null, REDIRECT.whenNOTAuthorized);
        },

        pendingRequests: function () {
            this.loadWrapperView('pendingRequests', null, REDIRECT.whenNOTAuthorized);
        },

        bookings: function () {
            this.loadWrapperView('bookings', null, REDIRECT.whenNOTAuthorized);
        },

        stylistPayments: function () {
            this.loadWrapperView('stylistPayments', null, REDIRECT.whenNOTAuthorized);
        },

        clientPackages: function () {
            this.loadWrapperView('clientPackages', null, REDIRECT.whenNOTAuthorized);
        },

        gallery: function () {
            this.loadWrapperView('gallery', null, REDIRECT.whenNOTAuthorized);
        },

        addStylists: function () {
            this.loadWrapperView('stylists', {}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        stylistDetails: function (id) {
            this.loadWrapperView('stylists', {id: id}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        /*users: function () {
            this.loadWrapperView('users', null, REDIRECT.whenNOTAuthorized);
        },

        taskList : function (){
            this.loadWrapperView('taskList', null, REDIRECT.whenNOTAuthorized);
        },

        documents: function (viewType) {
            this.loadWrapperView('documents', {viewType : viewType}, REDIRECT.whenNOTAuthorized);
        },

        forPreview: function (docType, id){
            if (docType === 'templates' || docType === 'documents') {
                this.loadWrapperView('templatesPre', {docType: docType, id: id}, REDIRECT.whenNOTAuthorized);
            } else {
                Backbone.history.navigate("users", {trigger: true});
            }
        },

        signature : function (type, token) {
            if (type === 'company'){
                return this.loadWrapperView('signature', {token : token}, REDIRECT.whenNOTAuthorized, 'Company');
            }
            if (type === 'user'){
                return this.loadWrapperView('signature', {token : token}, null, 'User');
            }

            Backbone.history.navigate("users", {trigger: true});
        },

        templates: function (viewType) {
            this.loadWrapperView('templates', {viewType : viewType}, REDIRECT.whenNOTAuthorized);
        },

        settings: function () {
            this.loadWrapperView('settings', null, REDIRECT.whenNOTAuthorized);
        },

        help: function(){
            this.loadWrapperView('help', null, REDIRECT.whenNOTAuthorized);
        },

        newUsers: function() {
            this.loadWrapperView('newUsers', null, REDIRECT.whenNOTAuthorized);
        }*/

    });

    return appRouter;
});
