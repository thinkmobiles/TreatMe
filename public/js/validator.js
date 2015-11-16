'use strict';

define([
    'Validator'
], function (validator) {
    validator.extend('isLocation', function (str) {
        return true;
    });
    return validator;
});