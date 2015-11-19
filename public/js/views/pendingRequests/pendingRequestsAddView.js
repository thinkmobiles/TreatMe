'use strict';

define([
    'models/bookingModel',
    'collections/clientsCollection',
    'collections/servicesCollection',
    'collections/stylistLocationCollection',
    'text!templates/pendingRequests/addTemplate.html',
    'text!templates/pendingRequests/selectTemplate.html',
    'text!templates/pendingRequests/mapDialogTemplate.html',
    'gmaps',
    'timepicker'
], function (StylistModel, ClientsCollection, ServicesCollection, StylistLocationCollection, MainTemplate, selectTemplate, mapDialogTemplate, GMaps, timepicker) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .saveBtn": "saveStylist",
            "click #editBtn": "edit",
            "click #acceptBtn": "saveStylist",
            "click #removeBtn": "removeStylist",
            "click .book": "showDialog"
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

        showDialog:function(e){
            var stylist = $(e.target).attr("data-id");
            console.log(stylist);

        },

        showClients: function () {
            var clients = this.clientsCollection.toJSON();

            clients = _.map(clients, function (client) {
                return {
                    _id: client._id,
                    name: client.personalInfo.firstName + " " + client.personalInfo.lastName
                }
            });
            this.$el.find("#clients").html(_.template(selectTemplate)({list: clients}));
        },
        showServices: function () {
            var services = this.servicesCollection.toJSON();
            console.log(services);

            this.$el.find("#services").html(_.template(selectTemplate)({list: services}));
        },

        mapsDialog:function(stylist){
            return _.template(mapDialogTemplate)({stylist: stylist});
        },

        showLocations: function () {
            var locations = this.stylistLocationCollection.toJSON();
            console.log(locations);
            var self = this;
            this.map = new GMaps({
                div: '#map',
                disableDefaultUI: true,
                draggable: false,
                zoomControl: false,
                scrollwheel: false,
                click: function(e) {
                    self.map.hideInfoWindows();
                    self.map.fitZoom();
                }
            });
            locations.forEach(function (item) {

                var marker = self.map.addMarker({
                    lat: item.coordinates[1],
                    lng: item.coordinates[0],
                    title: item.name,
                    icon:"images/marker.png",
                    infoWindow: {
                        content:self.mapsDialog(item)
                    }

                });
                google.maps.event.addListener(marker.infoWindow, 'domready', function() {
                    var infoWindow = $('#stylistLocationDetails').parent().parent().parent().parent();
                    infoWindow.addClass("infoWindow");
                    infoWindow.find(">div").eq(2).hide();
                    infoWindow.find(">div").eq(0).find(">div").eq(0).hide();
                    infoWindow.find(">div").eq(0).find(">div").eq(2).hide();
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


            $("#date").datepicker();
            $('#time').timepicker({
                disableTextInput:true
            });
            return this;
        }


    });

    return View;
});
