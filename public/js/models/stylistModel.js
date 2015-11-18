'use strict';

define([
    '/js/validator.js'
], function (validator) {
    var Model = Backbone.Model.extend({
        //validator: validator,
        urlRoot : '/admin/stylist',
        idAttribute: "_id",
        defaults: {
            personalInfo: {},
            salonInfo: {}
        },
        validate: function (attrs, options) {
            var errors = [];
            var email = attrs.email;
            var personalInfo = attrs.personalInfo;
            var salonInfo = attrs.salonInfo;
            var firstName = personalInfo.firstName;
            var lastName = personalInfo.lastName;
            var personalPhone = personalInfo.phone;
            var salonName = salonInfo.salonName;
            var salonPhone = salonInfo.salonName;
            var businessRole = salonInfo.businessRole;
            var salonEmail = salonInfo.email;
            var address = salonInfo.address;
            var licenseNumber = salonInfo.licenseNumber;
            var city = salonInfo.city;
            var zipCode = salonInfo.zipCode;
            var state = salonInfo.state;
            var country = salonInfo.country;
            /*var requiredFields = [
                /!*'firstName',
                'lastName',
                'personalPhone',
                'profession',*!/
                'address',
                'businessRole',
                'city',
                'country',
                //'salonEmail',
                'email',
                'licenseNumber',
                //'salonPhone',
                'phone',
                'salonName',
                'state',
                'zipCode'
            ];

            var requiredErrorMessages = {
                /!*'firstName': 'First Name is required',
                'lastName': 'Last Name is required',
                'personalPhone': 'Personal Number is required',
                'profession': 'Profession is required',*!/
                'address' : 'Address is required',
                'businessRole': 'Business Role is required',
                'city': 'City is required',
                'country': 'Country is required',
                'salonEmail': 'Salon Email is required',
                'licenseNumber': 'License Number is required',
                //'salonPhone': 'Salon Number is required',
                'phone': 'Salon Number is required',
                'salonName': 'Salon Name is required',
                'state': 'State is required',
                'zipCode': 'Zip Code is required'
            };*/

            console.log(attrs);

            /*  --- email --- */
            if (!email) {
                errors.push({name: 'email', message: 'Please fill Email field.'});
            } else {
                if (!validator.isEmail(email)) {
                    errors.push({name: 'email', message: 'Incorrect Email.'});
                }
            }

            /* --- first name --- */
            if (!firstName) {
                errors.push({name: 'firstName', message: 'First Name is required!'});
            }

            /* --- last name --- */
            if (!lastName) {
                errors.push({name: 'lastName', message: 'Last Name is required!'});
            }

            /* --- personal phone number --- */
            if (!personalPhone) {
                errors.push({name: 'personalPhone', message: 'Phone Number is required!'});
            }

            /* --- salon name --- */
            if (!salonName) {
                errors.push({name: 'salonName', message: 'Salon Name is required!'});
            }

            /*  --- salon email --- */
            if (!salonEmail) {
                errors.push({name: 'salonEmail', message: 'Please fill Email field.'});
            } else {
                if (!validator.isEmail(salonEmail)) {
                    errors.push({name: 'salonEmail', message: 'Incorrect Email.'});
                }
            }
           /* var field;

            for (var i = requiredFields.length-1; i>=0; i-- ) {
                console.log(requiredFields[i]);

                field = requiredFields[i];
                if (!salonInfo[field]) {
                    errors.push({name: field, message: requiredErrorMessages[field]});
                }
            }
*/
            /* --- salon phone number --- */
            if (!salonPhone) {
                errors.push({name: 'salonPhone', message: 'Phone Number is required!'});
            }

            /* --- business role --- */
            if (!businessRole) {
                errors.push({name: 'businessRole', message: 'Phone Number is required!'});
            }

            /* --- address --- */
            if (!address) {
                errors.push({name: 'address', message: 'Address is required!'});
            }

            /* --- license number --- */
            if (!licenseNumber) {
                errors.push({name: 'licenseNumber', message: 'License Number is required!'});
            }

            /* --- city --- */
            if (!city) {
                errors.push({name: 'city', message: 'City is required!'});

            }

            /* --- zip code --- */
            if (!zipCode) {
                errors.push({name: 'zipCode', message: 'Zip Code is required!'});
            }

            /* --- state --- */
            if (!state) {
                errors.push({name: 'state', message: 'State is required!'});
            }

            /* --- country --- */
            if (!country) {
                errors.push({name: 'country', message: 'Country is required!'});
            }

            return (errors.length) ? errors : false;
        },

        checkRequiredFields: function (attrs) {
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
        },

        checkFieldsTypes: function (attrs) {
            var validator = this.validator;
            var errors = [];

            if (!validator.isEmail(attrs.email)) {
                errors.push({name: 'email', message: 'Incorrect Email.'});
            }

            if (!validator.isLocation(attrs.salonInfo.city)) {
                errors.push({name: 'city', message: 'Incorrect format for location'});
            }

            return errors;
        },

        updateCurrent: function (options, callbackObj) {
            options = options || {};

            options.url = '/profile' + this.id;

            return Backbone.Model.prototype.save.call(this, options, callbackObj);
        },

        //deleteRequest: function (data, callback) {
        deleteRequest: function (options) {
            var opts = options || {};
            var len = arguments.length;
            var ids;
            var data;

            if (opts.data) {
                data = opts.data;
            } else {
                ids = [this.id];
                data = JSON.stringify({ids: ids});
            }

            $.ajax({
                type: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                url: '/admin/stylist',
                data: data,
                success: opts.success,
                error: opts.error
            })
        }/*,

        toJSON: function () {
            var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

            if (!json.personalInfo) {
                json.personalInfo = {};
            }

            if (!json.salonInfo) {
                json.salonInfo = {};
            }

            return json;
        }*/
    });

    return Model;
});