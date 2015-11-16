'use strict';

define([
    'models/bookingModel',
    'collections/clientsCollection',
    'collections/servicesCollection',
    'collections/stylistLocationCollection',
    'text!templates/pendingRequests/addTemplate.html',
    'text!templates/pendingRequests/selectTemplate.html',
    'gmaps'
], function (StylistModel, ClientsCollection, ServicesCollection, StylistLocationCollection, MainTemplate, selectTemplate, GMaps) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            "click #editBtn": "edit",
            "click #acceptBtn": "saveStylist",
            "click #removeBtn": "removeStylist"
        },

        initialize: function (options) {
            var self = this;

            this.model = new StylistModel();
            App.Breadcrumbs.reset([{name: 'Pending Requests', path: '#pendingRequests'}, {
                name: 'Add Request',
                path: '#pendingRequests/add'
            }]);
            self.model.on('invalid', self.handleModelValidationError);
            this.render();
            this.clientsCollection = new ClientsCollection();
            this.clientsCollection.bind("reset", self.showClients, self);

            this.servicesCollection = new ServicesCollection();
            this.servicesCollection.bind("reset", self.showServices, self);


            this.stylistLocationCollection = new StylistLocationCollection();
            this.stylistLocationCollection.bind("reset", self.showLocations, self);


        },

        showClients: function () {
            var clients = this.clientsCollection.toJSON();

            clients = _.map(clients, function (client) {
                return {
                    _id: client._id,
                    name: client.personalInfo.firstName + " " + client.personalInfo.lastName
                }
            });
            this.$el.find(".clients").html(_.template(selectTemplate)({list: clients}));
        },
        showServices: function () {
            var services = this.servicesCollection.toJSON();
            console.log(services);

            this.$el.find(".services").html(_.template(selectTemplate)({list: services}));
        },

        showLocations: function () {
            var locations = this.stylistLocationCollection.toJSON();
            console.log(locations);
            var self = this;
            this.map = new GMaps({
                div: '#map'
            });
            var infoWindow = new google.maps.InfoWindow({});
            locations.forEach(function (item) {
                self.map.addMarker({
                    lat: item.coordinates[1],
                    lng: item.coordinates[0],
                    title: item.name,
                    click: function (point) {
                        infoWindow.setContent('You clicked here!');
                        infoWindow.setPosition(point.latLng);
                        infoWindow.open(map.map);
                    }

                });
            });
            this.map.fitZoom();

        },

        render: function () {
            var self = this;
            var $el = self.$el;
            var pendingRequest = self.model.toJSON();

            $('.searchBlock').html('');

            $el.html(self.mainTemplate({pendingRequest: pendingRequest}));

            return this;
        },


    });

    return View;
});
