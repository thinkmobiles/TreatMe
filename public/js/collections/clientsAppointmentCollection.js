'use strict';

define([
    'collections/parentCollection',
    'models/clientModel'

], function (ParentCollection, Model) {
    var Collection = ParentCollection.extend({
        model: Model,
        baseUrl: '/admin/client',
        url: function () {
            return this.baseUrl;
        }/*,
        initialize: function (options) {
            if (options && options.id) {
                this.baseUrl += '/' + options.id;
            }
            //this.parse();
        },
        parse: function (res) {
            console.log(res);
            return res.appointment;
        }*/
    });

    return Collection;
});