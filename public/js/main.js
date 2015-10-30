/**
 * Created by andrey on 16.07.15.
 */

var App = {};

require.config({
    paths: {
        jQuery          : './libs/jquery/dist/jquery',
        jQueryUI        : './libs/jqueryui/jquery-ui',
        Underscore      : './libs/underscore/underscore',
        Backbone        : './libs/backbone/backbone',
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

require(['app', 'socketio'], function(app, io){

    Backbone.View.prototype.handleError = function (err) {
        if (err.message) {
            alert(err.message);
        } else {
            alert(err);
        }
    };

    Backbone.View.prototype.handleModelError = function (model, response, options) {
        var errMessage = response.responseJSON.message;
        alert(errMessage);
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

    app.initialize(io);
});