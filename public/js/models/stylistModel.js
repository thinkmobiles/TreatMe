'use strict';

define([], function () {
    var Model = Backbone.Model.extend({
        urlRoot : '/admin/stylist',
        idAttribute: "_id",

        validate: function (attrs) {
            var errors = this.checkRequiredFields(attrs);

            return errors.length > 0 ? errors : false;
        },

        checkRequiredFields: function (attrs) {
            var errors = [];
            var personalRequiredFields = [
                'firstName',
                'lastName',
                'phoneNumber',
                'profession'
            ];
            var salonRequiredFields = [
                'address',
                'businessRole',
                'city',
                'country',
                'email',
                'licenseNumber',
                'phoneNumber',
                'salonName',
                'state',
                'zipCode'
            ];
            var personalRequiredErrors = [
                {name: 'firstName', message: 'Please fill First Name field.'},
                {name: 'lastName', message: 'Please fill Last Name field.'},
                {name: 'phoneNumber', message: 'Please fill Phone Number field.'},
                {name: 'profession', message: 'Please fill Profession field.'}
            ];
            var salonRequiredErrors = [
                {name: 'address', message: 'Please fill Address field.'},
                {name: 'businessRole', message: 'Please fill Business Role field.'},
                {name: 'city', message: 'Please fill City field.'},
                {name: 'country', message: 'Please fill Country field.'},
                {name: 'salonEmail', message: 'Please fill Salon Email field.'},
                {name: 'licenseNumber', message: 'Please fill License Number field.'},
                {name: 'phoneNumber', message: 'Please fill Phone Number field.'},
                {name: 'salonName', message: 'Please fill Salon Name field.'},
                {name: 'state', message: 'Please fill State field.'},
                {name: 'zipCode', message: 'Please fill Zip Code field.'}
            ];

            if (!attrs.email) {
                errors.push({name: 'email', message: 'Please fill Email field.'});
            }

            if (!attrs.services.length) {
                errors.push({name: 'services', message: 'Please choose some service which you gonna giving.'})
            }

            for (var i = personalRequiredFields.length; i--; ) {
                if(!attrs.personalInfo[personalRequiredFields[i]]) {
                    errors.push(personalRequiredErrors[i]);
                }
            }

            for (var j = salonRequiredFields.length; j--; ) {
                if(!attrs.salonInfo[salonRequiredFields[j]]) {
                    errors.push(salonRequiredErrors[j]);
                }
            }
            return errors;
        },

        updateCurrent: function (options, callbackObj) {
            options = options || {};

            options.url = '/profile' + this.id;

            return Backbone.Model.prototype.save.call(this, options, callbackObj);
        },

        deleteRequest: function (data, callback) {
            $.ajax({
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                url: '/admin/stylist',
                data: data,
                success: callback,
                error: this.handleModelError //TODO
            })
        }
    });

    return Model;
});