'use strict';

define([
    'js/validator.js'
], function (validator) {
    var Model = Backbone.Model.extend({
        validator: validator,
        urlRoot : '/admin/client',
        idAttribute: "_id",

        validate: function (attrs, options) {
            var errors = [];
            var firstName = attrs.firstName;
            var lastName = attrs.lastName;
            var phone = attrs.phone;
            var email = attrs.email;
            var password = attrs.password;

            /* ---email ---*/
            if (!email) {
                errors.push({name: 'email', message: 'Please fill Email field.'});
            } else {
                if (!validator.isEmail(email)) {
                    errors.push({name: 'email', message: 'Incorrect Email.'});
                }
            }
            /* ---firstName ---*/
            if (!firstName) {
                errors.push({name: 'firstName', message: 'Please fill First Name field.'});
            }
            /* ---lastName ---*/
            if (!lastName) {
                errors.push({name: 'lastName', message: 'Please fill Last Name field.'});
            }
            /* ---phone ---*/
            if (!phone) {
                errors.push({name: 'phone', message: 'Please fill Phone field.'});
            } else {

            }
            /* ---password--- */
            if (!password) {
                errors.push({name: 'password', message: 'Please fill Password field.'})
            } else {

            }

            return (errors.length) ? errors : false;
        }
    });

    return Model;
});