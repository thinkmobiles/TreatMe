/**
 * Created by andrey on 16.07.15.
 */

var App = {};

require.config({
    paths: {
        jQuery          : './libs/jquery/dist/jquery',
        jQueryUI        : './libs/jqueryui/jquery-ui',
        Validator       : './libs/validator-js/validator',
        Underscore      : './libs/underscore/underscore',
        Backbone        : './libs/backbone/backbone',
        Moment          : './libs/moment/moment',
        async           : './libs/requirejs-plugins/src/async',
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

require(['app', 'socketio', 'Validator','Moment'], function(app, io, validator, moment){

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
        if (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                if (xhr.status === 401) {
                    Backbone.history.navigate("login", { trigger: true });
                } else {
                    alert("You do not have permission to perform this action");
                }
            } else {
                if (xhr.responseJSON) {
                    alert(xhr.responseJSON.error);
                } else {
                    Backbone.history.navigate("users", { trigger: true });
                }
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