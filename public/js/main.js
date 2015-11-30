'use strict';

var App = {};

require.config({
    paths: {
        jQuery          : './libs/jquery/dist/jquery',
        jQueryUI        : './libs/jqueryui/jquery-ui',
        Validator       : './libs/validator-js/validator', //TODO
        Underscore      : './libs/underscore/underscore',
        Backbone        : './libs/backbone/backbone',
        Moment          : './libs/moment/moment',
        async           : './libs/requirejs-plugins/src/async',
        asyncjs         : './libs/async/lib/async',
        googlemaps      : './libs/googlemaps-amd/src/googlemaps',
        timepicker      : './libs/jt.timepicker/jquery.timepicker.min',
        gmaps           : './libs/gmaps/gmaps',
        maps            : './libs/googleMapsAPI',
        //less            : './libs/less/dist/less',
        socketio        : '/socket.io/socket.io',
        views           : './views',
        models          : './models',
        collections     : './collections',
        text            : './libs/text/text',
        templates       : '../templates'
    },
    shim: {
        'jQueryUI'      : ['jQuery'],
        'Backbone'      : ['Underscore', 'jQueryUI'],
        'app'           : ['Backbone'/*,'less'*/]
    }
});

require(['app', 'socketio', 'Validator'], function(app, io, validator){

    validator.extend('isPhoneNumber', function (str) {
        return /^\+?[1-9]\d{4,14}$/.test(str);
    });

    Backbone.View.prototype.handleError = function (err) {
        if (err.message) {
            alert(err.message);
        } else {
            alert(err);
        }
    };

    Backbone.View.prototype.handleModelError = function (model, response, options) {
        var errMessage = response.responseJSON ? response.responseJSON.message : 'Something broke!';
        alert(errMessage);
    };

    Backbone.View.prototype.handleModelValidationError = function (model, errors, options) {
        var controlGroup;

        this.$el.find('.prompt').text('');

        _.each(errors, function (error) {
            controlGroup = this.$el.find('.' + error.name);
            controlGroup.addClass('error');
            controlGroup.next('.prompt').text(error.message);
        }, this);

        alert('Validation Error');
    };

    Backbone.View.prototype.handleErrorResponse = function (xhr) {
        var errMessage;

        if (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                if (xhr.status === 401) {
                    Backbone.history.navigate("login", { trigger: true });
                } else {
                    alert("You do not have permission to perform this action");
                }
            } else {
                if (xhr.responseJSON) {
                    errMessage = xhr.responseJSON.error || xhr.responseJSON.message;
                    alert(errMessage);
                } /*else {
                    Backbone.history.navigate("dashboard", { trigger: true });
                }*/
            }
        }
    };

    Date.prototype.toLocaleDateString = function () {
        function padding(x) {
            if (x.length < 2) {
                return '0' + x;
            } else {
                return x;
            }
        }

        var year = this.getFullYear().toString();
        var month = (this.getMonth() + 1).toString();
        var date  = this.getDate().toString();

        var yy = year.slice(2, 4);
        var mm = padding(month);
        var dd = padding(date);

        return dd + '/' + mm + '/' + yy;
    };

    App.$notifications = $('#notifications');

    //App.errorNotification = function (data) {
    App.notification = function (data) {
        var container = this.$notifications;
        var messageClass = data.type || 'error';
        var text = (typeof data === 'string') ? data : (data.message || 'Something went wrong');
        var renderEl = '<div class="animate ' + messageClass + '">' + text + '</div>';

        container.append(renderEl);

        container.find('div.animate').delay(10).animate({
            left   : "85%",
            opacity: 0.9
        }, 500, function () {
            var self = $(this);

            self.removeClass('animate').delay(5000).animate({
                left   : "100%",
                opacity: 0
            }, 1000, function () {
                self.remove();
            });
        });
    };

    Date.prototype.toLocaleDateTimeString = function () {
        function padding(x) {
            if (x.length < 2) {
                return '0' + x;
            } else {
                return x;
            }
        }

        var year = this.getFullYear().toString();
        var month = (this.getMonth() + 1).toString();
        var date  = this.getDate().toString();
        var hour = this.getHours().toString();
        var minutes = this.getMinutes().toString();
        var format  = this.getDate();

        var yy = year.slice(2, 4);
        var mm = padding(month);
        var dd = padding(date);
        var hh = padding(hour);
        var min = padding(minutes);

        return dd + '/' + mm + '/' + yy + ' ' + hh + ':' + min;
    };


    app.initialize(io);
});