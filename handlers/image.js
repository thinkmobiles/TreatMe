
var async = require('async');
var CONSTANTS = require('../constants/index');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var badRequests = require('../helpers/badRequests');

var uploaderConfig;
var amazonS3conf;

if (process.env.UPLOADER_TYPE === 'AmazonS3') {
    amazonS3conf = require('../config/aws');
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        awsConfig: amazonS3conf
    };
} else {
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        directory: process.env.FILESYSTEM_BUCKET
    };
}

var imageHandler = function () {

    'use strict';

    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

    this.createImageName = function(){
        return (new ObjectId()).toString();
    };

    this.computeUrl = function (imageName, bucket) {
        return imageUploader.getImageUrl(imageName, bucket) + '.png';
    };

    this.uploadImage = function(imageString, imageName, bucket, callback){
        imageUploader.uploadImage(imageString, imageName, bucket, callback);
    };

    this.deleteImage = function(imageName, bucket, callback){
        imageUploader.removeImage(imageName, bucket, callback);
    };
};

module.exports = imageHandler;
