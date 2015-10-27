var CONSTANTS = require('../constants');

var AdminHandler = function(db){

    var Services = db.model('Service');

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

        Services
            .findOneAndUpdate({stylist: stylistId, serviceId: serviceId}, {approved: true}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Service approved successfully'});

            });

    };

};

module.exports = AdminHandler;