/**
 * @description admin profile management module
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
var async = require('async');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');

var AdminHandler = function (db) {

    var self = this;
    var image = new ImageHandler(db);
    var user = new UserHandler(null, db);
    var Services = db.model('Service');
    var ServiceType = db.model('ServiceType');
    var SubscriptionType = db.model('SubscriptionType');
    var Subscription = db.model('Subscription');
    var User = db.model('User');
    var Gallery = db.model('Gallery');
    var Appointment = db.model('Appointment');

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    function getStylistById(sId, callback) {

        var userObj;

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

                Services
                    .find({stylist: ObjectId(sId), approved: true}, {price: 1, _id: 0, serviceId: 1})
                    .populate({path: 'serviceId', select: '-_id name'})
                    .exec(function(err, serviceModels){

                        if (err){
                            return callback(err);
                        }

                        userObj = resultModel.toJSON();

                        if (serviceModels.length){
                            userObj.approvedServices = serviceModels;
                        } else {
                            userObj.approvedServices = []
                        }

                        callback(null, userObj);
                    });
            });
    }

    this.getStylistByCriterion = function(criterion, page, sortObj, limit, callback){

        var resultArray = [];
        var obj;
        var total;

        criterion.role = CONSTANTS.USER_ROLE.STYLIST;

        User
            .find(criterion, {
                'personalInfo.firstName': 1,
                'personalInfo.lastName': 1,
                'salonInfo': 1,
                'createdAt': 1,
                'approved': 1
            })
            .sort(sortObj)
            .skip(limit * (page - 1))
            .limit(limit)
            .exec(function(err, resultModel){
                if (err){
                    return callback(err);
                }

                total = resultModel.length;

                for (var i = resultModel.length; i--; ){

                        obj = {
                            _id: resultModel[i]._id,
                            personalInfo: resultModel[i].personalInfo,
                            salonInfo: resultModel[i].salonInfo.salonName || {},
                            createdAt: resultModel[i].createdAt,
                            approved:  resultModel[i].approved
                        };

                    resultArray.push(obj);
                }

                callback(null, resultArray.reverse());

            });
    };

    function getCountByCriterion(findObj, callback){

        User
            .count(findObj, function(err, resultCount){

                if (err){
                    return callback(err);
                }

                callback(null, resultCount);

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
         * __Query params: page, limit, status [requested, approved, all], search__
         *
         * This __method__ allows get stylist list by some criterion for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylist?page=1&limit=20&status=requested&search=Banana
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * [
         *      {
         *          "_id": "563b4e0e1886cc5c16c95375",
         *          "personalInfo": {
         *              "firstName": "Banana 9 ",
         *              "lastName": "Orange"
         *          },
         *          "salonInfo": {},
         *          "createdAt": "2015-11-05T12:39:42.779Z",
         *          "approved": false
         *      },
         *      {
         *          "_id": "563b4e091886cc5c16c95374",
         *          "personalInfo": {
         *              "firstName": "Banana 8 ",
         *              "lastName": "Orange"
         *          },
         *          "salonInfo": {},
         *          "createdAt": "2015-11-05T12:39:37.030Z",
         *          "approved": false
         *      }
         * ]
         *
         *
         * @method getStylistList
         * @instance
         */

        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_STYLISTS;
        var statusRegExp = /^requested$|^all$/;
        var sort = req.query.sort || 'date';
        var order = (req.query.order === '1') ? 1 : -1;
        var status = req.query.status;
        var search = req.query.search || '';
        var searchRegExp;
        var sortObj = {};
        var searchObj = {};
        var criterion;
        var approvedObj = {};

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');

            searchObj['$or'] = [
                    {'personalInfo.firstName': {$regex: searchRegExp}},
                    {'personalInfo.lastName': {$regex: searchRegExp}},
                    {'email': {$regex: searchRegExp}},
                    {'salonInfo.salonName': {$regex: searchRegExp}}
                ];
        }

        if (!statusRegExp.test(status)) {
            status = 'all';
        }

        if (sort === 'salon'){
            sortObj['salonInfo.salonName'] =  order;
        } else if (sort === 'status'){
            sortObj['approved'] = order;
        } else if (sort === 'name'){
            sortObj['personalInfo.firstName'] = order;
            sortObj['personalInfo.lastName'] = order;
        } else {
            sortObj['createdAt'] = order;
        }

        if (status === 'requested') {
            approvedObj['approved'] = false;
        } else if (status === 'approved') {
            approvedObj['approved'] = true;
        }

        criterion = {$and: [{role: CONSTANTS.USER_ROLE.STYLIST}, searchObj, approvedObj]};

        async
            .parallel([
                function(cb){
                    getCountByCriterion(criterion, cb)
                },

                function(cb){
                    self.getStylistByCriterion(criterion, page, sortObj, limit, cb)
                }
            ], function(err, result){

                if (err){
                    return next(err);
                }

                res.status(200).send({total: result[0], data: result[1]});

            });
    };

    this.getStylistById = function (req, res, next) {

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
         *   {
         *       "_id": "563b2c9315fd1706214adaae",
         *       "role": "Stylist",
         *       "createdAt": "2015-11-05T10:16:51.787Z",
         *       "activeSubscriptions": [],
         *       "salonInfo": {
         *           "licenseNumber": "",
         *           "country": "",
         *           "city": "",
         *           "zipCode": "",
         *           "state": "",
         *           "address": "",
         *           "businessRole": "Employee",
         *           "email": "",
         *           "phone": "",
         *           "salonName": ""
         *      },
         *      "personalInfo": {
         *          "avatar": "",
         *          "facebookURL": "",
         *          "phone": "01",
         *          "profession": "",
         *          "lastName": "Vashkeba",
         *          "firstName": "Misha"
         *      },
         *      "suspend": {
         *          "history": [
         *              {
         *                  "_id": "563b565abaea58c30ca7dfd8",
         *                  "reason": "",
         *                  "from": "2015-11-05T13:15:06.906Z"
         *              }
         *          ],
         *          "isSuspend": true
         *      },
         *      "approved": true,
         *      "email": "vashm@mail.ua",
         *      "coordinates": [],
         *      "approvedServices": [
         *          {
         *              "serviceId": {
         *                  "name": "Blowout"
         *              },
         *              "price": 15
         *          }
         *      ]
         *  }
         *
         *
         * @method getStylistById
         * @instance
         */

        var sId = req.params.id;

        getStylistById(sId, function (err, resultUser) {
            if (err) {
                return next(err);
            }

            res.status(200).send(resultUser);

        });


    };

    this.createStylist = function (req, res, next) {

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
         *   },
         *   services: [{
         *      serviceId: 563342cf1480ea7c109dc385,
         *      price: 20
         *   }, {
         *      serviceId: 563342cf1480ea7c109dc386,
         *      price: 25
         *   }]
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
        var services;


        if (!body.email || !personal.firstName || !personal.lastName || !personal.profession || !personal.phoneNumber
            || !salon.salonName || !salon.businessRole || !salon.phoneNumber
            || !salon.email || !salon.address || !salon.licenseNumber
            || !salon.city || !salon.zipCode || !salon.country) {

            return next(badRequests.NotEnParams());

        }

        body.password = getEncryptedPass(password);
        body.approved = true;
        body.role = CONSTANTS.USER_ROLE.STYLIST;

        services = body.services || [];

        delete body.services;

        user.addStylistProfile(body, function (err, uId) {

            if (err) {
                return next(err);
            }

            services = services.map(function (service) {

                service.serviceId = ObjectId(service.serviceId);
                service.stylist = uId;
                service.approved = true;

                return service;
            });

            Services.create(services, function (err) {

                if (err) {
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

        });

    };


    this.approveStylist = function (req, res, next) {

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

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({
                _id: {$in: ids},
                approved: false,
                role: CONSTANTS.USER_ROLE.STYLIST
            }, {$set: {approved: true}}, {multi: true}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Stylists approved successfully'});
            });


    };

    this.removeStylist = function (req, res, next) {

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

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User.remove({_id: {$in: ids}, role: CONSTANTS.USER_ROLE.STYLIST, approved: false}, function (err) {

            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'Stylists deleted successfully'});

        });
    };

    this.suspendUsers = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/suspend`__
         *
         * This __method__ allows suspend users by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/suspend
         *
         * {
         *      ids: [563342cf1480ea7c109dc385, 563342cf1480ea7c109dc386]
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Users suspended successfully"}
         *
         * @method suspendUsers
         * @instance
         */

        var body = req.body;
        var ids;

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({_id: {$in: ids}},
            {
                $set: {
                    suspend: {
                        isSuspend: true,
                        $push: {
                            history: {
                                from: Date.now(),
                                reason: 'Suspended by admin'
                            }
                        }
                    }
                }
            }, {multi: true})
            .exec(function (err) {

                if (err) {
                    return next(err);
                }


                res.status(200).send({success: 'Users suspended successfully'});
            });
    };

    this.activateUsers = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/activate`__
         *
         * This __method__ allows activate users by _Admin_
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
         * {"success": "Users activated successfully"}
         *
         * @method activateUsers
         * @instance
         */

        var body = req.body;
        var ids;

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({_id: {$in: ids}}, {$set: {suspend: {isSuspend: false}}}, {multi: true})
            .exec(function(err){

                if (err) {
                    return next(err);
                }


                res.status(200).send({success: 'Users activated successfully'});
            });
    };

    this.getRequestedService = function (req, res, next) {

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
            .find({approved: false}, {__v: 0})
            .populate({path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'})
            .skip(limit * (page - 1))
            .limit(limit)
            .exec(function (err, resultModel) {

                if (err) {
                    return next(err);
                }

                res.status(200).send(resultModel);

            });
    };

    this.approveService = function (req, res, next) {

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
         *  "stylistId": "563342cf1480ea7c109dc385",
         *  "price": 25
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
        var price = body.price;

        if (!body.serviceId || !body.stylistId || !body.price) {
            return next(badRequests.NotEnParams({reqParams: 'serviceId or stylistId or price'}));
        }

        Services
            .findOneAndUpdate({stylist: stylistId, serviceId: serviceId}, {$set: {approved: true, price: body.price}}, function (err) {

                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Service approved successfully'});

            });

    };

    this.addService = function (req, res, next) {

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

        if (!body.name || !body.logo) {
            return next(badRequests.NotEnParams({params: 'name or logo'}));
        }

        createObj = {
            name: body.name,
            logo: imageName
        };

        image
            .uploadImage(body.logo, imageName, CONSTANTS.BUCKET.IMAGES, function (err) {

                if (err) {
                    return next(err);
                }

                serviceModel = new ServiceType(createObj);

                serviceModel
                    .save(function (err) {

                        if (err) {
                            return next(err);
                        }


                        res.status(200).send({success: 'Service created successfully'});

                    });

            });
    };

    this.getServices = function (req, res, next) {

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

        if (id) {
            findObj._id = id;
        }

        ServiceType[findType](findObj, {__v: 0})
            .exec(function (err, resultModel) {

                if (err) {
                    return next(err);
                }

                if (!resultModel.length) {
                    return res.status(200).send([]);
                }

                for (var i = resultModel.length; i--;) {
                    (resultModel[i]).logo = image.computeUrl((resultModel[i]).logo, CONSTANTS.BUCKET.IMAGES);
                }

                res.status(200).send(resultModel);

            });

    };

    this.updateService = function (req, res, next) {

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

        if (body.name) {
            updateObj.name = body.name;
        }

        if (body.logo) {
            updateObj.logo = body.logo;
        }

        ServiceType
            .findOneAndUpdate({_id: sId}, {$set: updateObj}, function (err) {

                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Service updated successfully'});

            });

    };

    this.removeService = function (req, res, next) {

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

        async
            .waterfall([
                function(cb){
                    ServiceType
                        .findOneAndRemove({_id: sId}, function(err, result){
                            if (err){
                                return cb(err);
                            }

                            cb(null, result.logo);

                        });
                },

                function(logo, cb){
                    image.deleteImage(logo, CONSTANTS.BUCKET.IMAGES, cb);
                },

                function(cb){
                    Services
                        .findOneAndRemove({serviceId: sId}, function (err) {

                            if (err) {
                                return cb(err);
                            }

                            cb(null)

                        });
                }

            ], function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Service removed successfully'})
            });
    };

    this.removeAppointments = function (req, res, next) {
        var arrayOfId = req.body.appointments;

        if (!arrayOfId || !arrayOfId.length) {
            return next(badRequests.NotEnParams({reqParams: 'arrayOfId'}))
        }

        arrayOfId = arrayOfId.toObjectId();

        Appointment
            .remove({_id: {$in: arrayOfId}}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Appointments was removed successfully'});
            });
    };

    this.suspendAppointments = function (req, res, next) {
        var arrayOfId = req.body.appointments;

        if (!arrayOfId || !arrayOfId.length) {
            return next(badRequests.NotEnParams({reqParams: 'arrayOfId'}))
        }

        arrayOfId = arrayOfId.toObjectId();

        Appointment
            .update({_id: {$in: arrayOfId}}, {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.SUSPENDED}}, {multi: true}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Appointments was suspended successfully'});
            });
    };

    this.bookAppointment = function (req, res, next) {
        var clientId = req.body.clientId;
        var stylistId = req.body.stylistId;
        var serviceTypeId = req.body.serviceTypeId;
        var bookingDate = req.body.bookingDate;
        var appointmentModel;
        var saveObj;

        if (!clientId || !stylistId || !serviceTypeId || !bookingDate) {
            return next(badRequests.NotEnParams({reqParams: 'clientId and stylistId and serviceTypeId and bookingDate'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)) {
            return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(stylistId)) {
            return next(badRequests.InvalidValue({value: stylistId, param: 'stylistId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(serviceTypeId)) {
            return next(badRequests.InvalidValue({value: serviceTypeId, param: 'serviceTypeId'}));
        }

        saveObj = {
            client: ObjectId(clientId),
            clientLoc: {type: 'Point', coordinates: [0, 0]},
            serviceType: ObjectId(serviceTypeId),
            status: CONSTANTS.STATUSES.APPOINTMENT.CONFIRMED,
            stylist: ObjectId(stylistId),
            bookingDate: bookingDate
        };

        appointmentModel = new Appointment(saveObj);

        Appointment
            .findOne({stylist: stylistId, bookingDate: bookingDate}, function (err, someModel) {
                var error;

                if (err) {
                    return next(err);
                }

                if (someModel) {
                    error = new Error('Stylist already have an appointment for this time');
                    error.status = 400;

                    return next(error);
                }

                appointmentModel
                    .save(function (err) {
                        if (err) {
                            return next(err);
                        }

                        res.status(200).send({success: 'Appointment booked successfully'});
                    });
            });
    };

    this.addSubscriptionType = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/subscription/`__
         *
         * This __method__ allows create subscription by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/subscription/
         *
         * @example Body example:
         * {
         *  "name": "Manicure",
         *  "price": "%99/MO",
         *  "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JF..." (Base64)
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {"success": "Subscription created successfully"}
         *
         * @method addSubscriptionType
         * @instance
         */

        var body = req.body;
        var subscriptionModel;
        var imageName = image.createImageName();
        var createObj;
        var allowServicesObjectId;

        if (!body.name || !body.logo || !body.price || !body.allowServices || !body.allowServices.length) {
            return next(badRequests.NotEnParams({reqParams: 'name and logo and price and allowServices'}));
        }

        allowServicesObjectId = body.allowServices.toObjectId();

        createObj = {
            name: body.name,
            price: body.price,
            logo: imageName,
            allowServices: allowServicesObjectId
        };

        image.uploadImage(body.logo, imageName, CONSTANTS.BUCKET.IMAGES, function (err) {
            if (err) {
                return next(err);
            }

            subscriptionModel = new SubscriptionType(createObj);

            subscriptionModel
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }


                    res.status(200).send({success: 'Subscription created successfully'});

                });
        });
    };

    this.getClientPackages = function (req, res, next) {
        var sortParam = req.query.sort;
        var order = (req.query.order === '1') ? 1 : -1;
        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_PACKAGES;
        var sortObj = {};

        if (sortParam && sortParam !== 'Date' && sortParam !== 'Name' && sortParam !== 'Package') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'Date' || !sortParam) {
            sortObj.purchaseDate = order;
        }

        if (sortParam === 'Name') {
            sortObj['client.personalInfo.firstName'] = order;
            sortObj['client.personalInfo.lastName'] = order;
        }

        if (sortParam === 'Package') {
            sortObj['subscriptionType.name'] = order;
        }

        Subscription
            .find({expirationDate: {$gte: new Date()}})
            .populate([{path: 'subscriptionType', select: 'name'}, {
                path: 'client',
                select: 'personalInfo.firstName personalInfo.lastName'
            }])
            .sort(sortObj)
            .skip(limit * (page - 1))
            .limit(limit)
            .exec(function (err, subscriptionModelsArray) {
                if (err) {
                    return next(err);
                }

                res.status(200).send(subscriptionModelsArray);
            });
    };

    this.removeSubscriptions = function (req, res, next) {
        var arrayOfIds = req.body.packagesArray;

        if (!arrayOfIds) {
            return next(badRequests.NotEnParams({reqParams: 'packagesArray'}));
        }
        arrayOfIds = arrayOfIds.toObjectId();

        Subscription
            .remove({_id: {$in: arrayOfIds}}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Subscriptions removed successfully'});
            });
    };

    this.getSubscriptionType = function (req, res, next) {

        SubscriptionType
            .find({}, function (err, subscriptionModelsArray) {
                if (err) {
                    return next(err);
                }

                res.status(200).send(subscriptionModelsArray);
            });
    };

    this.updateSubscriptionType = function (req, res, next) {
        var subscriptionTypeId = req.params.id;
        var name = req.body.name;
        var price = req.body.price;
        var imageString = body.logo;
        var imageName;
        var allowServices = body.allowServices;
        var updateObj = {};
        var allowServicesObjectId;
        var oldLogoName;

        if (!name && !imageString && !price && !allowServices && !allowServices.length) {
            return next(badRequests.NotEnParams({reqParams: 'name or logo or price or allowServices'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionTypeId)) {
            return next(badRequests.InvalidValue({value: subscriptionTypeId, param: 'id'}));
        }


        if (name) {
            updateObj.name = name;
        }

        if (price) {
            updateObj.price = price;
        }

        if (imageString) {
            imageName = image.createImageName();
            updateObj.logo = imageName;
        }

        if (allowServices) {
            allowServicesObjectId = allowServices.toObjectId();
            updateObj.allowServices = allowServicesObjectId;
        }

        async.series([

                function (cb) {
                    image.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                },

                function (cb) {
                    SubscriptionType
                        .findOneAndUpdate({_id: subscriptionTypeId}, {$set: updateObj}, function (err, subscriptionTypeModel) {
                            if (err) {
                                return cb(err);
                            }

                            if (!subscriptionTypeModel) {
                                return cb(badRequests.DatabaseError());
                            }

                            oldLogoName = subscriptionTypeModel.get('logo');

                            cb();
                        });
                },

                function(cb){
                    if (!oldLogoName){
                        return cb();
                    }

                    image.deleteImage(oldLogoName, CONSTANTS.BUCKET.IMAGES, cb);
                }

            ],

            function (err) {
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Subscription type was updated successfully'});
            }
        );
    };

    this.removeSubscriptionType = function (req, res, next) {
        var subscriptionTypeId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionTypeId)) {
            return next(badRequests.InvalidValue({value: subscriptionTypeId, param: 'id'}));
        }

        SubscriptionType
            .remove({_id: subscriptionTypeId}, function(err){
                if (err){
                    return next(err);
                }

                Subscription
                    .remove({subscriptionType: ObjectId(subscriptionTypeId)}, function(err){
                        if (err){
                            return next(err);
                        }

                        res.status(200).send({success: 'Subscription type was removed successfully'});
                    });
            });
    };

    this.getClientList = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/client/`__
         *
         * __Query params: page, limit, search__
         *
         * This __method__ allows get client list by some criterion for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/client?page=1&limit=20&search
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * [
         *     {
         *         "_id": "5633451985201c7409caa2e2",
         *         "personalInfo": {
         *             "lastName": "Petrovich",
         *             "firstName": "Petya"
         *         },
         *         "email": "Killer57575@gmail.com"
         *     },
         *     {
         *         "_id": "5633451985201c7509caa7e9",
         *         "personalInfo": {
         *             "lastName": "Oetrovich",
         *             "firstName": "Petya"
         *         },
         *         "email": "Killer@gmail.com"
         *     }
         * ]
         *
         * @method getClientList
         * @instance
         */

        var sortParam = req.query.sort;
        var order = (req.query.order === '1') ? 1 : -1;
        var page = (req.query.page >= 1) ? req.query.page : 1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_PACKAGES;
        var search = req.query.search;
        var searchRegExp;
        var sortObj = {};
        var findObj;
        var roleObj = {};
        var searchObj = {};

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');

            searchObj['$or'] = [
                {'personalInfo.firstName': {$regex: searchRegExp}},
                {'personalInfo.lastName': {$regex: searchRegExp}},
                {'email': {$regex: searchRegExp}}
            ];
        }

        if (sortParam && sortParam !== 'Name' && sortParam !== 'Email') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'Name' || !sortParam) {
            sortObj['personalInfo.firstName'] = order;
            sortObj['personalInfo.lastName'] = order;
        }

        if (sortParam === 'Email') {
            sortObj.email = order;
        }

        roleObj['role'] = CONSTANTS.USER_ROLE.CLIENT;

        findObj = {
            $and: [roleObj, searchObj]
        };

        async
            .parallel([
                function(cb){
                    getCountByCriterion(findObj, cb);
                },

                function(cb){
                    User
                        .find(findObj, {email: 1, 'personalInfo.firstName' :1, 'personalInfo.lastName' : 1})
                        .sort(sortObj)
                        .skip(limit * (page - 1))
                        .limit(limit)
                        .exec(cb)
                }
            ], function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send({total: result[0], data: result[1]});
            });


    };

    this.getClientById = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/client/:id`__
         *
         * This __method__ allows get client by id for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/client/563342cf1480ea7c109dc385
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "name": "Petya Petrovich",
         *     "phone": "123456789",
         *     "email": "Killer57575@gmail.com",
         *     "suspend": {
         *         "isSuspend": false,
         *         "history": []
         *     },
         *     "avatar": "http://localhost:8871/uploads/development/images/563b04c0b3b4c5300f06c983.png",
         *     "bookedAppointments": [
         *         {
         *             "_id": "563b06bc29ff2808236d3280",
         *             "serviceType": "",
         *             "bookingDate": "2015-12-05T10:23:51.060Z",
         *             "stylist": "Stylistname Abramovich",
         *             "status": "Confirmed"
         *         },
         *         {
         *             "_id": "563b068e29ff2808236d327f",
         *             "serviceType": "",
         *             "bookingDate": "2015-11-05T10:23:51.060Z",
         *             "stylist": "Stylistname Abramovich",
         *             "status": "Confirmed"
         *         }
         *     ],
         *     "purchasedPackages": [
         *         {
         *             "purchaseDate": "2015-11-05T09:19:32.436Z",
         *             "package": "Unlimited Blowout"
         *         }
         *     ],
         *     "currentPackages": [
         *         {
         *             "purchaseDate": "2015-11-05T09:19:32.436Z",
         *             "package": "Unlimited Blowout",
         *             "price": 99
         *         }
         *     ]
         * }
         *
         * @method getClientById
         * @instance
         */

        var clientId = req.params.id;
        var resultObj = {};
        var sortParam = req.query.sort;
        var order = (req.query.order === '1') ? 1 : -1;
        var limit = (req.query.limit >= 1) ? req.query.limit : CONSTANTS.LIMIT.REQUESTED_BOOKED_APPOINTMENTS;
        var sortObj = {};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
            return next(badRequests.InvalidValue({value: clientId, param: 'id'}));
        }

        if (sortParam && sortParam !== 'Booking' && sortParam !== 'Name' && sortParam !== 'Service' && sortParam !== 'Payment' && sortParam !== 'Status') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'Booking' || !sortParam) {
            sortObj.bookingDate = order;
        }

        if (sortParam === 'Name') {
            sortObj['stylist.personalInfo.firstName'] = order;
            sortObj['stylist.personalInfo.lastName'] = order;
        }

        if (sortParam === 'Service') {
            sortObj['serviceType.name'] = order;
        }

        if (sortParam === 'Payment') {
            //TODO: sortObj['payment'] = order;
        }

        if (sortParam === 'Status') {
            sortObj.status = order;
        }


        async.parallel([

                function(cb){
                    User
                        .findOne({_id: clientId, role: CONSTANTS.USER_ROLE.CLIENT}, function(err, clientModel){
                            var avatarName;

                            if (err){
                                return cb(err);
                            }

                            if (!clientModel){
                                return cb(badRequests.DatabaseError());
                            }

                            resultObj.name = clientModel.personalInfo.firstName + ' ' + clientModel.personalInfo.lastName;
                            resultObj.phone = clientModel.personalInfo.phone;
                            resultObj.email = clientModel.email;
                            resultObj.suspend = clientModel.suspend;

                            avatarName = clientModel.personalInfo.avatar;

                            if (avatarName){
                                resultObj.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                            } else {
                                resultObj.avatar = '';
                            }

                            cb();
                        });
                },

                function(cb){
                    var projectionObj = {
                        bookingDate: 1,
                        stylist: 1,
                        serviceType: 1,
                        //TODO: payment: 1,
                        status: 1
                    };

                    Appointment
                        .find({client: clientId, status: {$ne : CONSTANTS.STATUSES.APPOINTMENT.CREATED}}, projectionObj)
                        .populate([{path: 'serviceType', select: 'name'}, {path: 'stylist', select: 'personalInfo.firstName personalInfo.lastName'}])
                        .sort(sortObj)
                        .limit(limit)
                        .exec(function(err, appointmentModelsArray){
                            var bookedAppointmentsArray;

                            if (err){
                                return cb(err);
                            }

                            bookedAppointmentsArray = appointmentModelsArray.map(function(model){
                                var modelJSON = model.toJSON();

                                if (modelJSON.serviceType){
                                    modelJSON.serviceType = modelJSON.serviceType.name;
                                } else {
                                    modelJSON.serviceType = '';
                                }

                                modelJSON.stylist = modelJSON.stylist.personalInfo.firstName + ' ' + modelJSON.stylist.personalInfo.lastName;

                                return modelJSON;
                            });

                            resultObj.bookedAppointments = bookedAppointmentsArray;

                            cb();
                        });
                },

                function(cb){
                    Subscription
                        .find({client: clientId}, {_id: 0, purchaseDate: 1, expirationDate: 1, subscriptionType: 1})
                        .populate({path: 'subscriptionType', select: 'name price'})
                        .sort({purchaseDate: -1})
                        .limit(CONSTANTS.LIMIT.REQUESTED_PURCHASED_PACKAGES)
                        .exec(function(err, subscriptionModelsArray){
                            var subscriptionArray;
                            var activeSubscriptionArray = [];
                            var currentDate = new Date();

                            if (err){
                                return cb(err)
                            }

                            subscriptionArray = subscriptionModelsArray.map(function(model){
                                var modelJSON = model.toJSON();
                                var activeSubscription;

                                modelJSON.package = modelJSON.subscriptionType.name;
                                modelJSON.price = modelJSON.subscriptionType.price;
                                delete modelJSON.subscriptionType;

                                if (modelJSON.expirationDate >= currentDate){

                                    delete modelJSON.expirationDate;
                                    activeSubscription = _.clone(modelJSON);

                                    activeSubscriptionArray.push(activeSubscription);
                                }

                                delete modelJSON.price;

                                return modelJSON;
                            });

                            resultObj.purchasedPackages = subscriptionArray;
                            resultObj.currentPackages = activeSubscriptionArray;

                            cb();
                        });
                }
            ],

            function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send(resultObj);
        });
    };

    this.removeUserById = function(req, res, next){

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/user/:id`__
         *
         * This __method__ allows delete user by id for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/user/563342cf1480ea7c109dc385
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *  success: 'User was removed successfully'
         * }
         *
         * @method removeUserById
         * @instance
         */

        var userId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
            return next(badRequests.InvalidValue({value: userId, param: 'id'}));
        }

        async.parallel([

            function(cb){
                User
                    .findOne({_id: userId}, function(err, userModel){
                        var avatarName;

                        if (err){
                            return cb(err);
                        }

                        if (!userModel){
                            return cb(badRequests.DatabaseError());
                        }

                        avatarName = userModel.get('personalInfo.avatar');

                        userModel.remove(function(err){
                            if (err){
                                return cb(err);
                            }

                            if (avatarName){
                                image.deleteImage(avatarName, CONSTANTS.BUCKET.IMAGES, cb)
                            } else {
                                cb();
                            }
                        });
                    });
            },

            function(cb){
                Appointment.remove({$or: [{client: userId}, {stylist: userId}]}, cb);
            },

            function(cb){
                Gallery
                    .find({$or: [{client: userId}, {stylist: userId}]}, function(err, imageModelArray){
                        if (err){
                            return cb(err);
                        }

                        async.each(imageModelArray,

                            function(model, eachCb){
                                var imageName = model.get('_id').toString();

                                image.deleteImage(imageName, CONSTANTS.BUCKET.IMAGES, function(err){
                                    if (err){
                                        return eachCb(err);
                                    }

                                    model.remove(eachCb);
                                });
                            },

                            function(err){
                                if (err){
                                    return cb(err);
                                }

                                cb();
                            });
                });
            }

        ], function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'User was removed successfully'});
        })
    };

    this.updateClient = function(req, res, next){
        res.status(400).send('Not implemented yet');
    };

    this.createClient = function(req, res, next){
        res.status(400).send('Not implemented yet');
    };

};

module.exports = AdminHandler;