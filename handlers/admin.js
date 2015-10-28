var CONSTANTS = require('../constants');
var badRequests = require('../helpers/badRequests');
var ImageHandler = require('./image');

var AdminHandler = function(db){

    var image = new ImageHandler(db);
    var Services = db.model('Service');
    var ServiceType = db.model('ServiceType');

    this.getRequestedService = function(req, res, next){

        var page = (req.params.page >= 1) ? req.params.page : 1;

        Services
            .find({}, {__v: 0})
            .populate({path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'})
            .skip(CONSTANTS.LIMIT.REQUESTED_SERVICES * (page - 1))
            .limit(CONSTANTS.LIMIT.REQUESTED_SERVICES)
            .exec(function(err, resultModel){

                if (err){
                    return next(err);
                }

                res.status(200).send(resultModel);

            });
    };

    this.approveService = function(req, res, next){

        var body = req.body;
        var serviceId = body.serviceId;
        var stylistId = body.stylistId;

        if (!body.serviceId || !body.stylistId){
            return next(badRequests.NotEnParams({reqParams: 'serviceId or stylistId'}));
        }

        Services
            .findOneAndUpdate({stylist: stylistId, serviceId: serviceId}, {approved: true}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Service approved successfully'});

            });

    };

    this.addService = function(req, res, next){

        var body = req.body;
        var serviceModel;
        var imageName = image.createImageName();
        var createObj;

        if (!body.name || !body.logo){
            return next(badRequests.NotEnParams({params: 'name or logo'}));
        }

        createObj = {
            name: body.name,
            logo: imageName
        };

        image
            .uploadImage(body.logo, imageName, CONSTANTS.BUCKET.IMAGES, function(err){

                if (err){
                    return next(err);
                }

                serviceModel = new ServiceType(createObj);

                serviceModel
                    .save(function(err){

                        if (err){
                            return next(err);
                        }


                        res.status(200).send({success: 'Service created successfully'});

                    });

            });
    };

    this.getServices = function(req, res, next){

        ServiceType
            .find({}, {__v: 0})
            .exec(function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel.length){
                    return res.status(200).send([]);
                }

                for (var i = resultModel.length; i--; ){
                    (resultModel[i]).logo = image.computeUrl( (resultModel[i]).logo, CONSTANTS.BUCKET.IMAGES);
                }

                res.status(200).send(resultModel);

            });

    };

    this.updateService = function(req, res, next){

        var sId = req.params.id;
        var body = req.body;
        var updateObj = {};

        if (body.name){
            updateObj.name = body.name;
        }

        if (body.logo){
            updateObj.logo = body.logo;
        }

        ServiceType
            .findOneAndUpdate({_id: sId} , updateObj, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Service updated successfully'});

            });

    };

    this.removeService = function(req, res, next){

        var sId = req.params.id;

        ServiceType
            .findOneAndRemove({_id: sId}, function(err){

                if (err){
                    return next(err);
                }

                Services
                    .findOneAndRemove({serviceId: sId}, function(err){

                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'Service removed successfully'});

                    });

            });
    }

};

module.exports = AdminHandler;