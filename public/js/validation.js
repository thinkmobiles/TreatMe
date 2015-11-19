/**
 * Created by andrey on 12.06.15.
 */

define(
    function () {
        var invalidCharsRegExp = /[~<>\^\*₴]/;
        var emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var passRegExp = /^[\w\.@]{3,100}$/;

        var hasInvalidChars = function (validatedString) {
            return invalidCharsRegExp.test(validatedString);
        };

        var validateEmail = function (validatedString) {
            return emailRegExp.test(validatedString);
        };

        var validatePass = function (validatedString) {
            return passRegExp.test(validatedString);
        };

        var errorMessages = {

            requiredMsg         :  "field can not be empty",
            invalidCharsMsg     :  "field can not contain '~ < > ^ * ₴' signs",
            invalidEmailMsg     :  "field should contain a valid email address",
            invalidLoginMsg     :  "field value is incorrect",

            minLengthMsg: function (minLength) {
                return "field should be at least " + minLength + " characters long"
            },
            maxLengthMsg: function (maxLength) {
                return "field should be at least " + maxLength + " characters long"
            }
        };


        var checkEmailField = function (errorObject, fieldValue, fieldName) {
            errorObject[fieldName] = null;
            if (!fieldValue) {
                errorObject[fieldName] = errorMessages.requiredMsg;
                return fieldName+' '+errorObject[fieldName];
            }
            if (hasInvalidChars(fieldValue)) {
                errorObject[fieldName] = errorMessages.invalidCharsMsg;
                return fieldName+' '+errorObject[fieldName];
            }
            if (!validateEmail(fieldValue)) {
                errorObject[fieldName] = errorMessages.invalidEmailMsg;
                return fieldName+' '+errorObject[fieldName];
            } else {
                return false;
            }
        };


        var checkPasswordField = function (errorObject, fieldValue, fieldName) {
            errorObject[fieldName] = null;
            if (!fieldValue) {
                errorObject[fieldName] = errorMessages.requiredMsg;
                return fieldName+' '+errorObject[fieldName];
            }
            if (hasInvalidChars(fieldValue)) {
                errorObject[fieldName] = errorMessages.invalidCharsMsg;
                return fieldName+' '+errorObject[fieldName];
            }
            if (fieldValue.length < 6) {
                errorObject[fieldName] = errorMessages.minLengthMsg(6);
                return fieldName+' '+errorObject[fieldName];
            }
            if (fieldValue.length > 35) {
                errorObject[fieldName] = errorMessages.maxLengthMsg(35);
                return fieldName+' '+errorObject[fieldName];
            }
            if (!validatePass(fieldValue)) {
                errorObject[fieldName] = errorMessages.invalidLoginMsg;
                return fieldName+' '+errorObject[fieldName];
            } else {
                return false
            }

        };

        return {

            checkEmailField   :  checkEmailField,
            checkPasswordField:  checkPasswordField
        }
    });