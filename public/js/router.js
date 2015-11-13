'use strict';

define([
    'views/menu/topBarView',
    'constants/redirect'
], function (TopMenuView , REDIRECT) {

    var appRouter  = Backbone.Router.extend({

        wrapperView : null,
        topBarView  : null,

        routes: {
            "clients/add"               :  "clientsAddDetails",
            "clients/:id"               :  "clientsDetails",
            "login(/:type/*value)"      :  "login",
            "signup"                    :  "signup",
            "dashboard"                 :  "dashboard",
            //"newApplications"           :  "newApplications",
            "newApplications/add"       :  "newApplicationDetails",
            "newApplications/:id"       :  "newApplicationDetails",
            //"stylists(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "stylists",
            "stylists/add"              :  "addStylists",
            "stylists/:id"              :  "stylistDetails",
            "stylists/edit/:id"         :  "editStylistDetails",
            //"clients(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "clients",
            //"pendingRequests"           :  "pendingRequests",
            //"pendingRequests(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "pendingRequests",
            //"bookings"                  :  "bookings",
            //"bookings(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "bookings",
            //"stylistPayments"           :  "stylistPayments",
            //"clientPackages"            :  "clientPackages",
            //"clientPackages(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "clientPackages",
            "gallery"                   :  "gallery",
            ":type(/p=:page)(/c=:countPerPage)(/orderBy=:orderBy)(/order=:order)(/filter=:filter)":  "list",
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

        clientsAddDetails: function () {
            this.loadWrapperView('clients', null, REDIRECT.whenNOTAuthorized, 'Add');
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

        newApplications: function () {
            this.loadWrapperView('newApplications', null, REDIRECT.whenNOTAuthorized);
        },

        newApplicationDetails: function (id) {
            this.loadWrapperView('newApplications', {id: id}, REDIRECT.whenNOTAuthorized, 'Item');
        },

        stylists: function (page, countPerPage, orderBy, order, filter) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter
            };

            this.loadWrapperView('stylists', options, REDIRECT.whenNOTAuthorized);
        },

        clients: function (page, countPerPage, orderBy, order, filter) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter
            };

            this.loadWrapperView('clients', options, REDIRECT.whenNOTAuthorized);
        },

        pendingRequests: function (page, countPerPage, orderBy, order, filter) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter,
                status: 'Pending'
            };

            this.loadWrapperView('pendingRequests', options, REDIRECT.whenNOTAuthorized);
        },

        bookings: function (page, countPerPage, orderBy, order, filter) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter,
                status: 'Booked'
            };

            this.loadWrapperView('bookings', options, REDIRECT.whenNOTAuthorized);
        },

        stylistPayments: function () {
            this.loadWrapperView('stylistPayments', null, REDIRECT.whenNOTAuthorized);
        },

        clientPackages: function (page, countPerPage, orderBy, order, filter) {
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter
            };

            this.loadWrapperView('clientPackages', options, REDIRECT.whenNOTAuthorized);
        },
        
        list: function (type, page, countPerPage, orderBy, order, filter) {
            console.log('>>> list', type);
            var options = {
                page: parseInt(page),
                countPerPage: parseInt(countPerPage),
                orderBy: orderBy,
                order: order,
                filter: filter,
                status: 'Booked'
            };

            this.loadWrapperView(type, options, REDIRECT.whenNOTAuthorized);
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

        editStylistDetails: function (id) {
            this.loadWrapperView('stylists', {id: id}, REDIRECT.whenNOTAuthorized, 'Edit');
        }

    });

    return appRouter;
});
