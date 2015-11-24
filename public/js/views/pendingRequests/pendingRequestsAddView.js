'use strict';

define([
    'models/bookingModel',
    'models/clientAppointmentModel',
    'models/adminAppointmentModel',
    'collections/clientsCollection',
    'collections/servicesCollection',
    'collections/stylistLocationCollection',
    'text!templates/pendingRequests/addTemplate.html',
    'text!templates/pendingRequests/selectTemplate.html',
    'text!templates/pendingRequests/mapDialogTemplate.html',
    'text!templates/pendingRequests/bookDialogTemplate.html',
    'gmaps',
    'timepicker',
    'Moment'
], function (StylistModel, ClientAppointmentModel, AdminAppointmentModel, ClientsCollection, ServicesCollection, StylistLocationCollection, MainTemplate, selectTemplate, mapDialogTemplate, bookDialogTemplate, GMaps, timepicker, moment) {

    var View = Backbone.View.extend({

        el: '#wrapper',

        mainTemplate: _.template(MainTemplate),

        events: {
            "click .book": "showDialog",
            "click .searchBtn": "search",
            'click .modalBook .bookDialog':'book'
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

        book: function(e){
            var self = this;
            var hours = this.$el.find(".modalBook .time").val().split(":")[0];
            var minutes = this.$el.find(".modalBook .time").val().split(":")[1];

            var bookingDate = moment(this.$el.find(".modalBook .date").val(),"MM/DD/YYYY").add(hours, "h").add(minutes, "m")._d;
            var clientId = this.$el.find(".modalBook .clients option:selected").attr("data-id");
            var stylistId = this.$el.find(".modalBook .stylist").attr("data-id");
            var serviceType = this.$el.find(".modalBook .services option:selected").attr("data-id");

            var saveObj = {
                serviceType:serviceType,
                bookingDate:bookingDate,
                clientId:clientId,
                stylistId:stylistId

            };
            var adminAppointmentModel = new AdminAppointmentModel();

            adminAppointmentModel.on('invalid', self.handleModelValidationError, self);
            adminAppointmentModel.save(saveObj,{
                success: function () {
                    console.log('success created');
                    Backbone.history.navigate('pendingRequests', {trigger: true});
                },
                error: self.handleModelError
            });
        },

        search: function(){
            var self = this;
            var hours = this.$el.find("#time").val().split(":")[0];
            var minutes = this.$el.find("#time").val().split(":")[1];

            var serviceType = this.$el.find("#services option:selected").attr("data-id");
            var bookingDate = moment(this.$el.find("#date").val(),"MM/DD/YYYY").add(hours, "h").add(minutes, "m")._d;
            var clientId = this.$el.find("#clients option:selected").attr("data-id");
            var location =this.$el.find("#location").val();

            var saveObj = {
                serviceType:serviceType,
                bookingDate:bookingDate,
                clientId:clientId,
                location:location

            };
            var clientAppointmentModel = new ClientAppointmentModel();

            clientAppointmentModel.on('invalid', self.handleModelValidationError, self);
            clientAppointmentModel.save(saveObj,{
                success: function () {
                    console.log('success created');
                    Backbone.history.navigate('pendingRequests', {trigger: true});
                },
                error: self.handleModelError
            });
        },

        showDialog:function(e){
            var self = this;
            var stylistId = $(e.target).attr("data-id");
            var stylistName = $(e.target).attr("data-name");
            var formString = _.template(bookDialogTemplate)({
                clients: self.clients,
                services: self.servicesCollection.toJSON(),
                stylistId:stylistId,
                stylistName:stylistName

            });
            this.dialog = $(formString).dialog({
                modal:true,
                resizable: false,
                draggable: false,
                closeOnEscape: false,
                appendTo:"#wrapper",
                dialogClass: "modalBook",
                width: 400
            });
            this.$el.find(".modalBook .date").datepicker();
            this.$el.find(".modalBook .time").timepicker({
                disableTextInput:true,
                timeFormat: 'H:i',
                step: 15
            });

        },

        showClients: function () {
            this.clients = this.clientsCollection.toJSON();
            console.log(this.clients);
            this.clients = _.map(this.clients, function (client) {
                return {
                    _id: client._id,
                    name: client.personalInfo.firstName + " " + client.personalInfo.lastName
                }
            });
            console.log(this.clients);
            this.$el.find("#clients").html(_.template(selectTemplate)({list: this.clients}));
        },
        showServices: function () {
            var services = this.servicesCollection.toJSON();

            this.$el.find("#services").html(_.template(selectTemplate)({list: services}));
        },

        mapsDialog:function(stylist){
            return _.template(mapDialogTemplate)({stylist: stylist});
        },

        showLocations: function () {
            var locations = this.stylistLocationCollection.toJSON();
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
                disableTextInput:true,
                timeFormat: 'H:i',
                step: 15
            });
            return this;
        }


    });

    return View;
});
