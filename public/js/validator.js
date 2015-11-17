'use strict';

define([
    'Validator'
], function (validator) {
    validator.extend('isLocation', function (str) {
        return false;
    });

    return validator;
});