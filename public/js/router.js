'use strict';

define([
    'views/menu/topBarView',
    'constants/redirect'
], function (TopMenuView , REDIRECT) {

    var appRouter  = Backbone.Router.extend({

        wrapperView : null,
        topBarView  : null,

        routes: {
            "clients/:id/edit"          : "clientsEdit",
            "clients/add"               : "clientsAddDetails",
            "clients/:id"               : "clientsDetails",
            "login(/:type/*value)"      : "login",
            "signup"                    : "signup",
            "dashboard"                 : "dashboard",
            //"newApplications/:id"       : "newApplicationDetails",
            //"newApplications/add"       : 'stylistDetails', //"newApplicationDetails",
            //"newApplications/:id"       : "stylistDetails",
            "pendingRequests/add"       : "addPendingRequest",
            "pendingRequests/:id"       : "pendingRequestDetails",
            //"stylists/add"              : 'stylistDetails',//"addStylists",
            //"stylists/:id"              : "stylistDetails",
            //"stylists/:id/edit"         : "editStylistDetails",
            "gallery"                   : "gallery",
            ":type/add"                 : "showItemView",       //newApplications, stylists
            ":type/:id/edit"            : "showItemView",       //newApplications, stylists
            ":type/:id"                 : "showDetailsView",    //newApplications, stylists
            ":type(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/search=:search)":  "list",
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
                    return Backbone.history.navigate("dashboard", {trigger: true});
                }
            }

            require(['views/'+name+'/'+nameView], function (View) {
                self[nameView] = new View(params);

                if (self.wrapperView) {
                    self.wrapperView.undelegateEvents();
                }

                self.wrapperView = self[nameView];
            });
        },

        any: function () {
            Backbone.history.navigate("dashboard", {trigger: true});
        },

        clientsEdit: function (id) {
            this.loadWrapperView('clients', {id: id}, REDIRECT.whenNOTAuthorized, 'AddAndEdit');
        },

        clientsAddDetails: function () {
            this.loadWrapperView('clients', {}, REDIRECT.whenNOTAuthorized, 'AddAndEdit');
        },

        clientsDetails: function (id) {
            this.loadWrapperView('clients', {id: id}, REDIRECT.whenNOTAuthorized, 'Profile');
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

        newApplicationDetails: function (id) {
            this.loadWrapperView('newApplications', {id: id}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        pendingRequestDetails: function (id) {
            this.loadWrapperView('pendingRequests', {id: id}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        addPendingRequest: function (id) {
            this.loadWrapperView('pendingRequests', {id: id}, REDIRECT.whenNOTAuthorized, 'Add');
        },

        list: function (type, page, countPerPage, orderBy, order, search) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                search: search
            };

            if (type === 'pendingRequests') {
                options.status = 'Pending';
            }

            if (type === 'bookings') {
                options.status = 'Booked';
            }

            if (type === 'services') {
                options.status = 'Services';
            }

            this.loadWrapperView(type, options, REDIRECT.whenNOTAuthorized);
        },

        gallery: function () {
            this.loadWrapperView('gallery', null, REDIRECT.whenNOTAuthorized);
        },

        addStylists: function () {
            this.loadWrapperView('stylists', {}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        showDetailsView: function (type, id) {
            var options = {
                type: type,
                id: id
            };

            this.loadWrapperView('stylists', options, REDIRECT.whenNOTAuthorized, 'Details');
        },

        editStylistDetails: function (id) {
            this.loadWrapperView('stylists', {id: id}, REDIRECT.whenNOTAuthorized, 'Edit');
        },

        showItemView: function (type, id) {
            var options = {
                type: type,
                id: id
            };
            var path;

            if (type === 'newApplications') {
                path = 'stylists'
            } else {
                path = type;
            }

            this.loadWrapperView(path, options, REDIRECT.whenNOTAuthorized, 'Item');
        }

    });

    return appRouter;
});
