
/**
 * @description admin profile managment module
 * @module adminHandler
 *
 */

var CONSTANTS = require('../constants');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var ImageHandler = require('./image');
var UserHandler = require('./users');
var passGen = require('password-generator');
var mailer = require('../helpers/mailer')();
var crypto = require('crypto');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var AdminHandler = function(db){

    var self = this;
    var image = new ImageHandler(db);
    var user = new UserHandler(null, db);
    var Services = db.model('Service');
    var ServiceType = db.model('ServiceType');
    var User = db.model('User');

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    function getStylistById(sId, callback){

        User
            .findOne({_id: sId}, {fbId: 0, token: 0, forgotToken: 0, __v: 0, confirmed: 0}, function(err, resultModel){

                if (err){
                    return callback(err);
                }

                if (!resultModel){
                    err = new Error('User not found');
                    err.status = 404;
                    return callback(err);
                }

                callback(null, resultModel);

            });
    }

    this.getStylistByCriterion = function(criterion, page, limit, callback){

        var resultArray = [];
        var obj;

        criterion.role = CONSTANTS.USER_ROLE.STYLIST;

        User
            .find(criterion, {'personalInfo.firstName': 1, 'personalInfo.lastName': 1, 'salonInfo': 1, 'createdAt': 1})
            .skip(limit * (page - 1))
            .limit(CONSTANTS.LIMIT.REQUESTED_STYLISTS)
            .exec(function(err, resultModel){
                if (err){
                    return callback(err);
                }

                for (var i = resultModel.length; i--; ){

                        obj = {
                            _id: resultModel[i]._id,
                            personalInfo: resultModel[i].personalInfo,
                            salonInfo: resultModel[i].salonInfo.salonName || {},
                            createdAt: resultModel[i].createdAt
                        };

                    resultArray.push(obj);
                }

                callback(null, resultArray);

            });
    };



    this.getStylistList = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/`__
         *
         * __Query params: page, limit, status__
         *
         * This __method__ allows get stylist list by some sriterion for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist?page=1&limit=20&status=requested
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * [
         *       {
         *           "_id": "563342cf1480ea7c109dc385",
         *           "personalInfo": {
         *               "firstName": "Misha",
         *               "lastName": "Vashkeba"
         *           }
         *       }
         *  ]
         *
         *
         * @method getStylistList
         * @instance
         */

        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_STYLISTS;
        var statusRegExp = /^requested$|^all$/;
        var status = req.query.status;

        if (!statusRegExp.test(status)){
            status = 'all';
        }

        var criterion = {role: CONSTANTS.USER_ROLE.STYLIST};

        if (status === 'requested'){
            criterion.approved = false
        }

        self.getStylistByCriterion(criterion, page, limit, function(err, result){

            if (err){
                return next(err);
            }

            res.status(200).send(result);

        });

    };

    this.getStylistById = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/:id`__
         *
         * This __method__ allows get stylist by id for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist/563342cf1480ea7c109dc385
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "_id": "563342cf1480ea7c109dc385",
         *      "email": "vashkebam1991@gmail.com",
         *      "role": "Stylist",
         *      "salonInfo": {
         *          "businessRole": "Employee"
         *      },
         *      "personalInfo": {
         *          "firstName": "Misha",
         *          "lastName": "Vashkeba",
         *          "phone": "+380968571460",
         *          "profession": "Uborschyk"
         *      },
         *      "approved": false,
         *      "creationDate": "2015-11-02T08:41:12.752Z",
         *      "coordinates": []
         *  }
         *
         *
         * @method getStylistById
         * @instance
         */

        var sId = req.params.id;

        getStylistById(sId, function(err, resultUser){
            if (err){
                return next(err);
            }

           res.status(200).send(resultUser);

        });


    };

    this.createStylist = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/`__
         *
         * This __method__ allows add stylist by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist/
         *
         * @example Body example:
         * {
         *    "email":"vashm@mail.ua",
         *    "personalInfo": {
         *      "firstName": "Misha",
         *      "lastName": "Vashkeba",
         *      "profession": "Uborschyk",
         *      "phoneNumber": "01"
         *    },
         *    "salonInfo": {
         *      "salonName": "Name",
         *      "businessRole": "Dybil",
         *      "phoneNumber": "02",
         *      "email": "test@test.com",
         *      "address": "fdsghjkl;jhgf",
         *      "licenseNumber": "03",
         *      "city": "Uzh",
         *     "zipCode": "88001",
         *     "country": "Ukraine"
         *   }
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {"success": "Stylist created successfully"}
         *
         * @method createStylist
         * @instance
         */

        var body = req.body;
        var password = passGen(12, false);
        var mailOptions;
        var personal = body.personalInfo;
        var salon = body.salonInfo;


        if (!body.email || !personal.firstName || !personal.lastName || !personal.profession || !personal.phoneNumber
            || !salon.salonName || !salon.businessRole || !salon.phoneNumber
            || !salon.email || !salon.address || !salon.licenseNumber
            || !salon.city || !salon.zipCode || !salon.country){

            return next(badRequests.NotEnParams());

        }

        body.password = getEncryptedPass(password);
        body.approved = true;

        user.addStylistProfile(body, function(err){

            if (err){
                return next(err);
            }

            mailOptions = {
                name: body.personalInfo.firstName,
                email: body.email,
                password: password
            };

            mailer.adminCreateStylist(mailOptions);

            res.status(200).send({success: 'Stylist created successfully'});

        });

    };

    this.approveStylist = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/approve/`__
         *
         * This __method__ allows approve stylist by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist/approve/
         *
         * {
         *      ids: [563342cf1480ea7c109dc385, 563342cf1480ea7c109dc385]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Stylist approved successfully"}
         *
         * @method approveStylist
         * @instance
         */

        var body = req.body;
        var ids;

        if (!body.ids){
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({_id: {$in: ids}, approved: false, role: CONSTANTS.USER_ROLE.STYLIST}, {approved: true}, {multi: true}, function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Stylists approved successfully'});
            });


    };

    this.removeStylist = function(req, res, next){

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/`__
         *
         * This __method__ allows delete stylist by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist/
         *
         * {
         *      ids: [563342cf1480ea7c109dc385, 563342cf1480ea7c109dc385]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Stylists deleted successfully"}
         *
         * @method removeStylist
         * @instance
         */


        var body = req.body;
        var ids;

        if (!body.ids){
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User.remove({_id: {$in: ids}, role: CONSTANTS.USER_ROLE.STYLIST, approved: false}, function(err){

            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Stylists deleted successfully'});

        });
    };

    this.suspendStylists = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylist/suspend`__
         *
         * This __method__ allows suspend stylist by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist/suspend
         *
         * {
         *      ids: [563342cf1480ea7c109dc385, 563342cf1480ea7c109dc385]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Stylists suspended successfully"}
         *
         * @method suspendStylist
         * @instance
         */

        var body = req.body;
        var ids;

        if (!body.ids){
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({_id: {$in: ids}, role: CONSTANTS.USER_ROLE.STYLIST}, {$set: {suspend: {isSuspend: true, from: Date.now()}}}, {multi: true})
            .exec(function(err){

                if (err){
                    return next(err);
                }


                res.status(200).send({success: 'Stylists suspended successfully'});
            });
    };

    this.getRequestedService = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/services/requested`__
         *
         * __Query params: page, limit__
         *
         * This __method__ allows get requested services for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/services/requested?page=1&limit=20
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * @method getRequestedService
         * @instance
         */

        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_SERVICES;

        Services
            .find({}, {__v: 0})
            .populate({path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'})
            .skip(limit * (page - 1))
            .limit(limit)
            .exec(function(err, resultModel){

                if (err){
                    return next(err);
                }

                res.status(200).send(resultModel);

            });
    };

    this.approveService = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/service/approve/`__
         *
         * This __method__ allows approve service by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/service/approve
         *
         * @example Body example:
         * {
         *  "serviceId": "563342cf1480ea7c109dc385",
         *  "stylistId": "563342cf1480ea7c109dc385"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *  {"success": "Service approved successfully"}
         *
         * @method approveService
         * @instance
         */

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

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/service/`__
         *
         * This __method__ allows create service by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/service/
         *
         * @example Body example:
         * {
         *  "name": "Manicure",
         *  "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JF..." (Base64)
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {"success": "Service created successfully"}
         *
         * @method addService
         * @instance
         */

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

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/service/:id?`__
         *
         * This __method__ allows get services by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/service/
         *
         *         __or__
         *
         *         http://projects.thinkmobiles.com:8871/admin/service/563757004397730a2be12f0a
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * [
         *   {
         *       "_id": "563757004397730a2be12f0a",
         *       "name": "Manicure",
         *       "logo": "http://localhost:8871/uploads/development/images/563757004397730a2be12f09.png"
         *       }
         * ]
         *
         * @method getServices
         * @instance
         */

        var id = req.params.id;
        var findObj = {};
        var findType = 'find';

        if (id){
            findObj._id = id;
        }

        ServiceType[findType](findObj, {__v: 0})
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

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/service/:id`__
         *
         * This __method__ allows update service by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/service/562f8a8a91f7274b0daed414
         *
         *
         * {
         *      "name": "Pedicurerrrrrrrr",
         *      "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1..." (Base64)
         * }
         *
         * @param {string} [name] - service name
         * @param {string} [logo] - service logo
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Service updated successfully"}
         *
         * @method updateService
         * @instance
         */

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

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/service/:id`__
         *
         * This __method__ allows remove service by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/service/562f8a8a91f7274b0daed414
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Service removed successfully"}
         *
         * @method removeService
         * @instance
         */

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