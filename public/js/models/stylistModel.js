'use strict';

define([
    '/js/validator.js'
], function (validator) {
    var Model = Backbone.Model.extend({
        validator: validator,
        urlRoot : '/admin/stylist',
        idAttribute: "_id",
        validate: function (attrs, options) {
            var errors = [];
            var personalInfo = attrs.personalInfo;
            var salonInfo = attrs.salonInfo;
            var email = attrs.email;
            console.log(salonInfo);
            /*var firstName = personalInfo.firstName;
            var lastName = personalInfo.lastName;
            var profession = personalInfo.profession;
            var phoneNumber = personalInfo.phoneNumber;*/


            /*  --- email --- */
            if (!email) {
                errors.push({name: 'email', message: 'Please fill Email field.'});
            } else {
                if (!validator.isEmail(email)) {
                    errors.push({name: 'email', message: 'Incorrect Email.'});
                }
            }
            /* --- first name --- */
            if (!personalInfo.firstName) {
                errors.push({name: 'firstName', message: 'Please fill First Name field.'});
            }
            /* ---lastName ---*/
            if (!personalInfo.lastName) {
                errors.push({name: 'lastName', message: 'Please fill Last Name field.'});
            }
            /* ---proffesion--- */
            if (!personalInfo.profession) {
                errors.push({name: 'role', message: 'Please fill Profession field.'});
            }
            /* ---phone--- */
            if (!personalInfo.phoneNumber) {
                errors.push({name: 'phone', message: 'Please fill Phone Number field.'});
            } else {
                if (!validator.isNumeric(personalInfo.phoneNumber)) {
                    errors.push({name: 'phone', message: 'Incorrect Phone Number.'});
                }
            }
            /* ---Salon Name--- */
            if (!salonInfo.salonName) {
                errors.push({name: 'salonName', message: 'Please fill Salon Name field.'});
            }
            /* ---Business Role--- */
            if (!salonInfo.businessRole) {
                errors.push({name: 'businessRole', message: 'Please fill Business Role field.'});
            }
            /* ---Salon Namber-- */
            if (!salonInfo.phoneNumber) {
                errors.push({name: 'salonNumber', message: 'Please fill Salon Number field.'});
            } else {
                if (!validator.isNumeric(salonInfo.phoneNumber)) {
                    errors.push({name: 'salonNumber', message: 'Incorrect Salon Number.'});
                }
            }
            /* ---Salon Email--- */
            if (!salonInfo.email) {
                errors.push({name: 'salonEmail', message: 'Please fill Salon Email field.'});
            } else {
                if (!validator.isEmail(salonInfo.email)) {
                    errors.push({name: 'salonEmail', message: 'Incorrect Salon Email.'});
                }
            }
            /* ---Salon Address--- */
            if (!salonInfo.address) {
                errors.push({name: 'salonAddress', message: 'Please fill Salon Address field.'});
            } else {

            }
            /* ---Salon Address line 2--- */
            if (!salonInfo) {
                errors.push({name: 'salonAddress2', message: 'Please fill Salon Address line 2 field.'});
            } else {

            }
            /* ---License Number--- */
            if (!salonInfo.licenseNumber) {
                errors.push({name: 'license', message: 'Please fill License Number field.'});
            } else {

            }
            /* ---City--- */
            if (!salonInfo.city) {
                errors.push({name: 'city', message: 'Please fill City field.'});
            } else {

            }
            /* ---State/Province/Region--- */
            if (!salonInfo.state) {
                errors.push({name: 'region', message: 'Please fill State/Province/Region field.'});
            } else {

            }
            /* ---Zip Code--- */
            if (!salonInfo.zipCode) {
                errors.push({name: 'zip', message: 'Please fill Zip Code field.'});
            } else {

            }
            /* ---Country--- */
            if (!salonInfo.country) {
                errors.push({name: 'country', message: 'Please fill Country field.'});
            } else {

            }



            return (errors.length) ? errors : false;
        },

        /*checkRequiredFields: function (attrs) {
        //validate: function (attrs, options) {
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

            if (!validator.isLocation(attrs.salonInfo.city)) {
                errors.push({name: 'city', message: 'Incorrect format for location'});
                return errors;
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
        },*/

        /*checkFieldsTypes: function (attrs) {
            var validator = this.validator;
            var errors = [];

            if (!validator.isEmail(attrs.email)) {
                errors.push({name: 'email', message: 'Incorrect Email.'});
            }

            if (!validator.isLocation(attrs.salonInfo.city)) {
                errors.push({name: 'city', message: 'Incorrect format for location'});
            }

            return errors;
        },*/

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