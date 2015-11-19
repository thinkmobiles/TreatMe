'use strict';

define([
    'Validator',
    'maps'
], function (validator, maps) {
    validator.extend('isLocation', function (str) {
        return true;
    });
    return validator;
});