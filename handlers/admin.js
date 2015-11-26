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
var ClientHandler = require('./clients');
var passGen = require('password-generator');
var mailer = require('../helpers/mailer')();
var crypto = require('crypto');
var async = require('async');
var ObjectId = mongoose.Types.ObjectId;
var _ = require('lodash');
var StripeModule = require('../helpers/stripe');
var validator = require('validator');

var AdminHandler = function (app, db) {

    var self = this;
    var stripe = new StripeModule();
    var image = new ImageHandler(db);
    var user = new UserHandler(app, db);
    var client = new ClientHandler(app, db);
    var Services = db.model('Service');
    var ServiceType = db.model('ServiceType');
    var SubscriptionType = db.model('SubscriptionType');
    var Subscription = db.model('Subscription');
    var User = db.model('User');
    var Gallery = db.model('Gallery');
    var Appointment = db.model('Appointment');
    var Inbox = db.model('Inbox');
    var Payments = db.model('Payment');

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    function getStylistById(sId, callback) {

        async
            .parallel([

                function(cb){
                    User
                        .findOne({_id: sId}, {fbId: 0, token: 0, forgotToken: 0, __v: 0, confirmed: 0, 'salonInfo.availability': 0}, function(err, stylistModel){
                            if (err){
                                return cb(err);
                            }

                            if (!stylistModel){
                                err = new Error('Stylist not found');
                                err.status = 404;
                                return cb(err);
                            }

                            cb(null, stylistModel.toJSON());

                        });
                },

                function(cb){
                    user.getService(sId, function(err, resultServices){

                        if (err){
                            return cb(err);
                        }

                        cb(null, resultServices);
                    });
                },

                function(cb){
                    var count = 0;
                    var overallRating = 0;
                    Appointment
                        .find({'stylist.id': sId, status: CONSTANTS.STATUSES.APPOINTMENT.SUCCEEDED}, {rate: 1}, function(err, appColl){
                            if (err){
                                return cb(err);
                            }

                            if (!appColl.length){
                                return cb(null, 0);
                            }

                            appColl.map(function(app){
                                if (app.rate){
                                    count += 1;
                                    overallRating += app.rate;
                                }
                            });

                            cb(null, overallRating / count);

                        });
                }

            ], function(err, result){
                var stylist;

                if (err){
                    return callback(err);
                }

                stylist = result[0];
                stylist.services = result[1] || [];
                stylist.overallRating = result[2] || 0;

                if (stylist.personalInfo.avatar.length){
                    stylist.personalInfo.avatar = image.computeUrl(stylist.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                }

                callback(null, stylist);

            });
    }

    this.getUserByCriteria = function(role, criteria, page, sortObj, limit, callback){

        var resultArray = [];
        var obj;
        var total;
        var projection;

        if (role === CONSTANTS.USER_ROLE.STYLIST){
            projection = {
                'personalInfo.firstName': 1,
                'personalInfo.lastName': 1,
                'salonInfo': 1,
                'createdAt': 1,
                'approved': 1,
                'suspend.isSuspend': 1,
                'role': 1,
                'fullName': {
                    $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName']
                }
            };
        } else {
            projection = {
                'personalInfo.firstName': 1,
                'personalInfo.lastName': 1,
                'email': 1,
                'suspend.isSuspend': 1,
                'createdAt': 1,
                'role': 1,
                'fullName': {
                    $concat: ['$personalInfo.firstName', ' ', '$personalInfo.lastName']
                }
            };
        }

        User
            .aggregate([
                {
                    $project: projection
                },
                {
                    $match: criteria
                },
                {
                    $sort: sortObj
                },
                {
                    $skip: limit * (page - 1)
                },
                {
                    $limit: +limit
                }
            ], function(err, resultModel){
                if (err){
                    return callback(err);
                }

                total = resultModel.length;

                for (var i = resultModel.length; i--; ){

                    if (role === CONSTANTS.USER_ROLE.STYLIST){
                        obj = {
                            _id: resultModel[i]._id,
                            personalInfo: resultModel[i].personalInfo,
                            salonInfo: resultModel[i].salonInfo || {},
                            createdAt: resultModel[i].createdAt,
                            approved:  resultModel[i].approved,
                            suspend: resultModel[i].suspend ? resultModel[i].suspend.isSuspend : false
                        };
                    } else {

                        obj = {
                            _id: resultModel[i]._id,
                            personalInfo: resultModel[i].personalInfo,
                            email: resultModel[i].email,
                            suspend: resultModel[i].suspend ? resultModel[i].suspend.isSuspend : false
                        }
                    }


                    resultArray.push(obj);
                }

                callback(null, resultArray.reverse());

            });

       /* User
            .find(criteria, projection)
            .sort(sortObj)
            .skip(limit * (page - 1))
            .limit(limit)
            .exec(function(err, resultModel){

            });*/
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
         *   {
         *       total: 77,
         *       data: [
         *       {
         *          _id: "564f1a0777b6580f221a8761",
         *          personalInfo: {
         *              lastName: "istvan",
         *              firstName: "nazarovits test2"
         *          },
         *          salonInfo: {
         *          availability: {
         *              0: [ ],
         *              1: [ ],
         *              2: [ ],
         *              3: [ ],
         *              4: [ ],
         *              5: [ ],
         *              6: [ ]
         *          },
         *          licenseNumber: "License 123",
         *          country: "Ukraine",
         *          city: "Ужгород",
         *          zipCode: "88000",
         *          state: "Закарпаття",
         *          address: "PS street, ...",
         *          businessRole: "Stylist",
         *          email: "test_1448024558225@mail.com",
         *          phone: "+38 093 111 1111",
         *          salonName: "mySalon"
         *        },
         *          createdAt: "2015-11-20T13:03:03.004Z",
         *          approved: true
         *      },
         *      {
         *          _id: "564f19d1acfd4b7821da3f19",
         *          personalInfo: {
         *              lastName: "istvan",
         *              firstName: "nazarovits"
         *          },
         *          salonInfo: {
         *          availability: {
         *              0: [ ],
         *              1: [ ],
         *              2: [ ],
         *              3: [ ],
         *              4: [ ],
         *              5: [ ],
         *              6: [ ]
         *          },
         *          licenseNumber: "License 123",
         *          country: "Ukraine",
         *          city: "Ужгород",
         *          zipCode: "88000",
         *          state: "Закарпаття",
         *          address: "PS street, ...",
         *          businessRole: "Stylist",
         *          email: "test_1448024519597@mail.com",
         *          phone: "+38 093 111 1111",
         *          salonName: "mySalon"
         *          },
         *          createdAt: "2015-11-20T13:02:09.857Z",
         *          approved: true
         *       }
         *
         * @method getStylistList
         * @instance
         */

        var query = req.query;
        var page = (query.page >= 1) ? query.page : 1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_STYLISTS;
        var statusRegExp = /^requested$|^all$/;
        var sort = query.sort ? (query.sort).toLowerCase() : 'date';
        var order = (query.order === '1') ? 1 : -1;
        var status = query.status;
        var search = query.search || '';
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
                    {'fullName': {$regex: searchRegExp}},
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
                    self.getUserByCriteria(CONSTANTS.USER_ROLE.STYLIST, criterion, page, sortObj, limit, cb)
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
         *      payments: {
         *           recipientId: "rp_178vAwBmJOuEPWhp98m6GGCv",
         *           customerId: null
         *       },
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
         *      services: [
         *           {
         *               id: "5638ccde3624f77b33b6587d",
         *               name: "Manicure",
         *               logo: "http://localhost:8871/uploads/development/images/5638ccde3624f77b33b6587c.png",
         *               status: "new",
         *               price: 0
         *           },
         *           {
         *               id: "56408f8281c43c3a24a332fa",
         *               name: "Pedicure",
         *               logo: "http://localhost:8871/uploads/development/images/56408f8281c43c3a24a332f9.png",
         *               status: "new",
         *               price: 0
         *           }
         *          ],
         *      overallRating: 5
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
         *      "businessRole": "Employee",
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


        if (!body.email || !personal.firstName || !personal.lastName || !personal.profession || !personal.phone
            || !salon.salonName || !salon.businessRole || !salon.phone
            || !salon.address || !salon.licenseNumber
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
                service.approved = false;

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

                mailer.adminCreateUser(mailOptions);

                res.status(200).send({success: 'Stylist created successfully'});

            });

        });

    };

    this.createClient = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/client/`__
         *
         * This __method__ allows add client by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/client/
         *
         * @example Body example:
         * {
         *      "email": "vashm@mail.ua",
         *      "firstName": "Misha",
         *      "lastName": "Vashkeba",
         *      "phone": "21",
         *      "stripeToken": "tok_21349tfdjkfsdf324" (optional)
         *      "subscriptionId": "5638b976f8c11d9c04081343" (optional)
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {"success": "Client created successfully"}
         *
         * @method createClient
         * @instance
         */

        var body = req.body;
        var firstName = body.firstName;
        var lastName = body.lastName;
        var phone = body.phone;
        var email = body.email;
        var stripeToken = body.stripeToken;
        var password = passGen(12, false);
        var subscriptionId = body.subscriptionId;

        if (!firstName || !lastName || !phone || !email){
            return next(badRequests.NotEnParams({reqParams: 'firstName and lastName and phone and email'}))
        }

        if (subscriptionId && !CONSTANTS.REG_EXP.OBJECT_ID.test(subscriptionId)){
            return next(badRequests.InvalidValue({value: subscriptionId, param: 'subscriptionId'}));
        }

        async
            .waterfall([
                function (cb) {

                    User
                        .findOne({email: email, role: CONSTANTS.USER_ROLE.CLIENT}, function (err, model) {
                            if (err) {
                                return cb(err);
                            }

                            if (model){
                                return cb(badRequests.EmailInUse());
                            }

                            cb(null);

                        });
                },

                function(cb){
                    var data = {};

                    if (stripeToken){
                        data.source = stripeToken;
                    }

                    data.email = email;

                    stripe
                        .createCustomer(data, function(err, customer){

                            if (err){
                                return cb(err);
                            }

                            cb(null, customer.id);

                        });
                },

                function(customerId, cb){
                    var user;
                    var client = {
                        email: email,
                        password: getEncryptedPass(password),
                        role: CONSTANTS.USER_ROLE.CLIENT,
                        personalInfo: {
                            phone: phone,
                            firstName: firstName,
                            lastName: lastName
                        }
                    };

                    if (customerId){
                        client['payments'] = {
                            customerId: customerId
                        };
                    }

                    user = new User(client);

                    user
                        .save(function(err, userModel){
                            if (err){
                                return cb(err);
                            }

                            cb(null, userModel._id);
                        });
                },
                function(clientId, cb){
                    if (!subscriptionId || !stripeToken){
                        return cb();
                    }

                    client.buySubscription(clientId, subscriptionId, cb);
                },

                function(cb){
                    var mailOptions = {
                        name: firstName,
                        email: email,
                        password: password
                    };

                    mailer.adminCreateUser(mailOptions);

                    cb(null);
                }

            ], function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Client created successfully'});

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
         * This __method__ allows approve stylists by _Admin_
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
         *      ids: [563342cf1480ea7c109dc385, 563342cf1480ea7c109dc386],
         *      reason: 'Some suspend reason'
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
        var reason = body.reason || 'Suspended by admin';

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        User
            .update({_id: {$in: ids}},
                {
                    $set: {'suspend.isSuspend': true},
                    $push: {
                        'suspend.history': {
                            from: Date.now(),
                            reason: reason
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
         *         http://projects.thinkmobiles.com:8871/admin/activate
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
            .update({_id: {$in: ids}}, {$set: {'suspend.isSuspend': false}}, {multi: true})
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
         * This __method__ allows get list requested services to _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/services/requested
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * [
         *    {
         *        _id: "564ef61c59ebc4ec03f41c03",
         *        stylist: {
         *            _id: "5644b65026f889ac0328441f",
         *            personalInfo: {
         *            lastName: " Petrovich ",
         *            firstName: "Stylist"
         *               }
         *         },
         *        serviceId: "5638ccde3624f77b33b6587d",
         *        approved: false,
         *        price: 0
         *    },
         *    {
         *        _id: "564ef62759ebc4ec03f41c04",
         *        stylist: {
         *           _id: "5644b65026f889ac0328441f",
         *           personalInfo: {
         *           lastName: " Petrovich ",
         *           firstName: "Stylist"
         *              }
         *          },
         *       serviceId: "56408f8281c43c3a24a332fa",
         *       approved: false,
         *       price: 0
         *   }
         *   ]
         *
         * @method getRequestedService
         * @instance
         */

        var query = req.query;
        var page = (query.page >= 1) ? query.page : 1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_SERVICES;

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
         *  "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1JF..." (Base64),
         *  "price": 25
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

        if (!body.name || !body.logo || !body.price) {
            return next(badRequests.NotEnParams({params: 'name or logo'}));
        }

        createObj = {
            name: body.name,
            logo: imageName,
            price: body.price
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
        var criteria = {};

        if (id) {
            criteria._id = id;
        }

        async
            .parallel({
                count: function (cb){
                    ServiceType
                        .count(criteria, cb);
                },

                serviceColl: function(cb){
                    ServiceType
                        .find(criteria, {__v: 0})
                        .exec(function (err, resultModel) {

                            if (err) {
                                return cb(err);
                            }

                            if (!resultModel.length) {
                                return cb(null, [])
                            }

                            for (var i = resultModel.length; i--;) {
                                (resultModel[i]).logo = image.computeUrl((resultModel[i]).logo, CONSTANTS.BUCKET.IMAGES);
                            }

                            cb(null, resultModel);

                        });
                }
            }, function(err, result){

                if (err){
                    return next(err);
                }

                res.status(200).send({total: result.count, data: result.serviceColl});

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
         *      "logo": "/9j/4AAQSkZJRgABAQAAAQABAAD//gA7Q1..." (Base64),
         *      "price": 25
         * }
         *
         * @param {string} [name] - service name
         * @param {string} [logo] - service logo
         * @param {number} [price] - service price
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

        if (body.price){
            updateObj.price = body.price;
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

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/appointments/`__
         *
         * This __method__ allows remove requested appointment by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/appointment/
         *
         * @example Body example:
         *  {
         *      "ids": ["562f8a8a91f7274b0daed414", "562f8a8a91f7274b0daed411"]
         *  }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Appointments was removed successfully"}
         *
         * @method removeAppointments
         * @instance
         */

        var arrayOfId = req.body.ids;

        if (!arrayOfId || !arrayOfId.length) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}))
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

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/appointments/`__
         *
         * This __method__ allows suspend appointment by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/appointment/
         *
         * @example Body example:
         *  {
         *      "ids": ["562f8a8a91f7274b0daed414", "562f8a8a91f7274b0daed411"]
         *  }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {"success": "Appointments was suspended successfully"}
         *
         * @method suspendAppointments
         * @instance
         */

        var arrayOfId = req.body.ids;

        if (!arrayOfId || !arrayOfId.length) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}))
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

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/appointments/`__
         *
         * This __method__ allows to create appointment by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/appointment/
         *
         * @example Body example:
         *  {
         *      "serviceType":"5638ccde3624f77b33b6587d",
         *      "bookingDate":"2015-12-08T10:23:51.060Z",
         *      "clientId":"5633451985201c7409caa2e2",
         *      "stylistId":"56409b49ae6850e4046e6f3e"
         *  }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Appointment created successfully",
         *      "appointmentId": "5649f34f4306e82009a8967c"
         *  }
         *
         * @method bookAppointment
         * @instance
         */

        var body = req.body;
        var clientId = body.clientId;
        var stylistId = body.stylistId;
        var serviceType = body.serviceType;
        var bookingDate = body.bookingDate;
        var oneTimeService = true;
        var price;
        var clientFirstName;
        var clientLastName;
        var stylistFirstName;
        var stylistLastName;
        var serviceTypeName;

        if (!clientId || !stylistId || !serviceType || !bookingDate) {
            return next(badRequests.NotEnParams({reqParams: 'clientId and stylistId and serviceTypeId and bookingDate'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)) {
            return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(stylistId)) {
            return next(badRequests.InvalidValue({value: stylistId, param: 'stylistId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(serviceType)) {
            return next(badRequests.InvalidValue({value: serviceType, param: 'serviceTypeId'}));
        }

        async.parallel([

            function(cb){
                var statuses = CONSTANTS.STATUSES.APPOINTMENT;

                Appointment
                    .find({'client.id': clientId, status: {$in: [statuses.CREATED, statuses.CONFIRMED, statuses.BEGINS]}}, function(err, modelsArray){
                        var error;

                        if (err){
                            return cb(err);
                        }

                        if (modelsArray.length >=2){
                            error = new Error('Client already have two not finished appointments');
                            error.status = 400;

                            return cb(error);
                        }

                        cb();
                    });
            },

            function(cb){
                User
                    .findOne({_id: clientId}, {'personalInfo.firstName': 1, 'personalInfo.lastName': 1}, function(err, clientModel){
                        if (err){
                            return cb(err);
                        }

                        if (!clientModel){
                            return cb(badRequests.NotFound({target: 'Client'}));
                        }

                        clientFirstName = clientModel.get('personalInfo.firstName');
                        clientLastName = clientModel.get('personalInfo.lastName');

                        cb();
                    });
            },

            function(cb){
                User
                    .findOne({_id: stylistId}, {'personalInfo.firstName': 1, 'personalInfo.lastName': 1}, function(err, stylistModel){
                        if (err){
                            return cb(err);
                        }

                        if (!stylistModel){
                            return cb(badRequests.NotFound({target: 'Client'}));
                        }

                        stylistFirstName = stylistModel.get('personalInfo.firstName');
                        stylistLastName = stylistModel.get('personalInfo.lastName');

                        cb();
                    });
            },

            function(cb){
                ServiceType
                    .findOne({_id: serviceType}, {name: 1}, function(err, serviceTypeModel){
                        if (err){
                            return cb(err);
                        }

                        if (!serviceTypeModel){
                            return cb(badRequests.NotFound({target: 'ServiceType'}));
                        }

                        serviceTypeName = serviceTypeModel.get('name');

                        cb();
                    });
            },

            function (cb) {
                Appointment
                    .find({bookingDate: bookingDate, $or: [{'stylist.id': stylistId}, {'client.id': clientId}]}, function (err, someModelsArray) {
                        var error;

                        if (err) {
                            return cb(err);
                        }

                        if (someModelsArray.length) {
                            error = new Error('Stylist or client already have an appointment for this time');
                            error.status = 400;

                            return cb(error);
                        }

                        cb();
                    });
            },

            //onetime service or not
            function(cb){
                Subscription
                    .find({'client.id': clientId, expirationDate: {$gte: bookingDate}})
                    .populate({path: 'subscriptionType', select: 'allowServices'})
                    .exec(function(err, subscriptionModelsArray){
                        var allowedServices = [];

                        if (err){
                            return cb(err);
                        }

                        subscriptionModelsArray.map(function(model){
                            var servicesIds;

                            if (model.subscriptionType){

                                servicesIds = model.get('subscriptionType.allowServices');
                                servicesIds = servicesIds.toStringObjectIds();

                                allowedServices = allowedServices.concat(servicesIds);
                            }
                        });

                        if (allowedServices.indexOf(serviceType) !== -1){
                            oneTimeService = false
                        }

                        cb();
                    });
            },

            function (cb) {
                Services
                    .findOne({stylist: ObjectId(stylistId), serviceId: serviceType, approved: true}, {price: 1})
                    .exec(function(err, serviceModel){
                        if (err){
                            return cb(err);
                        }

                        if (!serviceModel){
                            return cb(badRequests.NotFound({target: 'Service'}));
                        }

                        price = serviceModel.get('price') || 0;

                        cb();
                    });
            }

        ], function (err) {
            var saveObj;
            var appointmentModel;

            if (err) {
                return next(err);
            }

            saveObj = {
                client: {
                    id: ObjectId(clientId),
                    firstName: clientFirstName,
                    lastName: clientLastName
                },
                clientLoc: {type: 'Point', coordinates: [0, 0], address: ''},
                serviceType: {
                    id: ObjectId(serviceType),
                    name: serviceTypeName
                },
                bookingDate: bookingDate,
                status: CONSTANTS.STATUSES.APPOINTMENT.CONFIRMED,
                oneTimeService: oneTimeService,
                price: price,
                stylist: {
                    id: ObjectId(stylistId),
                    firstName: stylistFirstName,
                    lastName: stylistLastName
                }
            };

            appointmentModel = new Appointment(saveObj);

            appointmentModel
                .save(function (err) {
                    var appointmentId;

                    if (err) {
                        return next(err);
                    }

                    appointmentId = (appointmentModel.get('_id')).toString();

                    res.status(200).send({success: 'Appointment created successfully', appointmentId: appointmentId});
                });
        });
    };

    this.getClientPackages = function (req, res, next) {

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/packages/`__
         *
         * This __method__ allows get list packages by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/packages/
         *
         * @example Response example:
         *
         * Response status: 200
         * {
         *   "total": 20,
         *   "data": [
         *           {
         *               "_id": "5645bec0499bf1d80facd36a",
         *               "client": "Petya Lyashenko",
         *               "subscriptionType": "Unlimited Pass",
         *               "purchaseDate": "2015-11-13T10:43:12.932Z"
         *           },
         *           {
         *               "_id": "5645bbeb9b6b6df41f426357",
         *               "client": "Petya Lyashenko",
         *               "subscriptionType": "Unlimited Pass",
         *               "purchaseDate": "2015-11-13T10:31:07.975Z"
         *           },
         *           {
         *               "_id": "5645bbd49b6b6df41f426356",
         *               "client": "Petya Lyashenko",
         *               "subscriptionType": "Unlimited Blowout",
         *               "purchaseDate": "2015-11-13T10:30:44.051Z"
         *           }
         *       ]
         * }
         *
         * @method getClientPackages
         * @instance
         */

        var query = req.query;
        var sortParam = (query.sort) ? (query.sort).toLowerCase(): null;
        var order = (query.order === '1') ? 1 : -1;
        var page = (query.page >= 1) ? query.page : 1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_PACKAGES;
        var sortObj = {};
        var search = query.search;
        var searchCriteria = {};
        var searchRegExp;
        var projection;

        var criteria = {
            $and:[{expirationDate: {$gte: new Date()}}]
        };

        if (sortParam && sortParam !== 'date' && sortParam !== 'client' && sortParam !== 'package') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'date' || !sortParam) {
            sortObj.purchaseDate = order;
        }

        if (sortParam === 'client') {
            sortObj['client.firstName'] = order;
            sortObj['client.lastName'] = order;
        }

        if (sortParam === 'package') {
            sortObj['subscriptionType.name'] = order;
        }

        projection = {
            client: 1,
            subscriptionType: 1,
            price: 1,
            purchaseDate: 1,
            expirationDate: 1,
            'clientFullName': {
                $concat: ['$client.firstName', ' ', '$client.lastName']
            }
        };

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');
            searchCriteria['$or'] = [
                {'client.firstName': {$regex: searchRegExp}},
                {'client.lastName': {$regex: searchRegExp}},
                {'clientFullName': {$regex: searchRegExp}},
                {'subscriptionType.name': {$regex: searchRegExp}}
            ];

            criteria['$and'].push(searchCriteria);
        }

        async.parallel([
            function(cb){
                Subscription
                    .count(criteria, function(err, count){
                        if (err){
                            return cb(err);
                        }

                        cb(null, count);
                    });
            },

            function(cb) {
                Subscription
                    .aggregate([
                        {
                            $project: projection
                        },
                        {
                            $match: criteria
                        },
                        {
                            $sort: sortObj
                        },
                        {
                            $skip: limit * (page - 1)
                        },
                        {
                            $limit: +limit
                        }
                    ], function (err, subscriptionModelsArray) {
                        var resultArray;

                        if (err) {
                            return next(err);
                        }

                        resultArray = subscriptionModelsArray.map(function (model) {
                            //var modelJson = model.toJSON();

                            if (model.client) {
                                model.client = model.client.firstName + ' ' + model.client.lastName;
                            } else {
                                model.client = 'Client was removed'
                            }
                            if (model.subscriptionType) {
                                model.subscriptionType = model.subscriptionType.name;
                            } else {
                                model.subscriptionType = 'Subscription was removed';
                            }

                            return model
                        });

                        cb(null, resultArray);
                    });
                }
            ], function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result[0], data: result[1]});
        });
    };

    this.removePackages = function (req, res, next) {

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/packages/`__
         *
         * This __method__ allows get list packages by _Admin_
         *
         * @example Request example:
         *        http://projects.thinkmobiles.com:8871/admin/packages/
         *
         * @example Body example:
         *
         * {
         *      "ids": ["5645bec0499bf1d80facd36a", "5645bec0499bf1d80facd36b"]
         * }
         *
         * @example Response example:
         *
         * Response status: 200
         * {"success": "Subscriptions removed successfully"}
         *
         * @method removePackages
         * @instance
         */

        var arrayOfIds = req.body.ids;

        if (!arrayOfIds) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
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
         * {
         *       total: 14,
         *       data: [
         *       {
         *       _id: "5644b666543c82ea1b153aed",
         *       personalInfo: {
         *       lastName: "йцукйцук",
         *       firstName: "йкцйук"
         *       },
         *       email: "sdf@sdf.comm"
         *       },
         *       {
         *       _id: "56444d272ee1465b107f0c69",
         *       personalInfo: {
         *       lastName: "m",
         *       firstName: "m"
         *       },
         *       email: "misha2g@icloud.com"
         *       }
         *  }
         *
         * @method getClientList
         * @instance
         */

        var query = req.query;
        var sortParam = query.sort;
        var order = (query.order === '1') ? 1 : -1;
        var page = (query.page >= 1) ? query.page : 1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_PACKAGES;
        var search = query.search;
        var searchRegExp;
        var sortObj = {};
        var criteria;
        var roleObj = {};
        var searchObj = {};

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');

            searchObj['$or'] = [
                {'personalInfo.firstName': {$regex: searchRegExp}},
                {'personalInfo.lastName': {$regex: searchRegExp}},
                {'fullName': {$regex: searchRegExp}},
                {'email': {$regex: searchRegExp}}
            ];
        }

        if (sortParam){
            sortParam = sortParam.toLowerCase()
        }

        if (sortParam && sortParam !== 'client' && sortParam !== 'email') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'client' || !sortParam) {
            sortObj['personalInfo.firstName'] = order;
            sortObj['personalInfo.lastName'] = order;
        }

        if (sortParam === 'email') {
            sortObj.email = order;
        }

        roleObj['role'] = CONSTANTS.USER_ROLE.CLIENT;

        criteria = {
            $and: [roleObj, searchObj]
        };

        async
            .parallel([
                function(cb){
                    getCountByCriterion(criteria, cb);
                },

                function(cb){
                   self.getUserByCriteria(CONSTANTS.USER_ROLE.CLIENT, criteria, page, sortObj, limit, cb)
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

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
            return next(badRequests.InvalidValue({value: clientId, param: 'id'}));
        }

        async.parallel([
                function(cb){
                    var client;

                    User
                        .findOne({_id: clientId, role: CONSTANTS.USER_ROLE.CLIENT}, {__V: 0, approved: 0, token: 0, forgotToken: 0, activeSubscriptions: 0, online: 0, payments: 0}, function(err, clientModel){
                            var avatarName;

                            if (err){
                                return cb(err);
                            }

                            if (!clientModel){
                                return cb(badRequests.DatabaseError());
                            }

                            client = clientModel.toJSON();

                            avatarName = clientModel.personalInfo.avatar;

                            if (avatarName.length){
                                client.personalInfo.avatar = image.computeUrl(avatarName, CONSTANTS.BUCKET.IMAGES);
                            } else {
                                client.personalInfo.avatar = '';
                            }

                            cb(null, client);
                        });
                },

                function(cb){
                    Subscription
                        .find({'client.id': clientId, expirationDate: {$gte: new Date()}}, {__v: 0, client: 0})
                        .populate({path: 'subscriptionType.id', select: 'name price'})
                        .exec(function (err, subscriptionModelsArray) {
                            var currentSubscriptions;

                            if (err) {
                                return cb(err);
                            }

                            currentSubscriptions = subscriptionModelsArray.map(function(model){
                                var modelJSON = model.toJSON();

                                if (modelJSON.subscriptionType && modelJSON.subscriptionType.id){
                                    modelJSON.package = modelJSON.subscriptionType.id.name;
                                    modelJSON.price = modelJSON.subscriptionType.id.price;
                                    modelJSON._id = modelJSON.subscriptionType.id._id.toString();
                                } else {
                                    modelJSON.package = 'Package was removed';
                                    modelJSON.price = '-';
                                }

                                delete modelJSON.subscriptionType;
                                delete modelJSON.expirationDate;

                                return modelJSON;
                            });


                            cb(null, currentSubscriptions);

                        });
                }
            ],

            function(err, result){
                var client = result[0] || {};
                client.currentSubscriptions = result[1] || {};

                if (err){
                    return next(err);
                }

                res.status(200).send(client);
        });
    };

    this.getBookedAppointment = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/appointments/:clientId`__
         *
         * This __method__ allows get client appointments by clientId for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/appointments/563342cf1480ea7c109dc385
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *      "total": 1,
         *      "data": [
         *          {
         *              "_id": "5649f4cbd50515f80a652526",
         *              "bookingDate": "2015-11-09T11:17:50.060Z",
         *              "price": 20,
         *              "stylist": "Stylist  Petrovich ",
         *              "status": "Succeeded",
         *              "serviceType": "Manicure"
         *          }
         *      ]
         * }
         * @method getBookedAppointment
         * @instance
         */

        var clientId = req.params.clientId;
        var query = req.query;
        var sortParam = query.sort;
        var page = (query.page >=1) ? query.page : 1;
        var order = (query.order === '1') ? 1 : -1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_BOOKED_APPOINTMENTS;
        var sortObj = {};
        var projection = {
            bookingDate: 1,
            stylist: 1,
            serviceType: 1,
            price: 1,
            status: 1
        };
        var criteria = {
            'client.id': ObjectId(clientId),
            status: {$ne : CONSTANTS.STATUSES.APPOINTMENT.CREATED}
        };

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
            return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
        }

        if (sortParam && sortParam !== 'date' && sortParam !== 'stylist' && sortParam !== 'service' && sortParam !== 'payment' && sortParam !== 'status') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'date' || !sortParam) {
            sortObj.bookingDate = order;
        }

        if (sortParam === 'stylist') {
            sortObj['stylist.firstName'] = order;
            sortObj['stylist.lastName'] = order;
        }

        if (sortParam === 'service') {
            sortObj['serviceType.name'] = order;
        }

        if (sortParam === 'payment') {
            sortObj.price = order;
        }

        if (sortParam === 'status') {
            sortObj.status = order;
        }

        async.parallel({

            appointmentCount: function(cb){
                Appointment
                    .count(criteria, function(err, count){
                        if (err){
                            return cb(err);
                        }

                        cb(null, count);
                    });
            },

            appointment: function(cb){
                Appointment
                    .find(criteria, projection)
                    .sort(sortObj)
                    .skip(limit * (page -1))
                    .limit(limit)
                    .exec(function(err, appointmentModelsArray){
                        var bookedAppointmentsArray;

                        if (err){
                            return cb(err);
                        }

                        bookedAppointmentsArray = appointmentModelsArray.map(function(model){
                            var modelJSON = model.toJSON();

                            if (modelJSON.serviceType && modelJSON.serviceType.name){
                                modelJSON.serviceType = modelJSON.serviceType.name;
                            } else {
                                modelJSON.serviceType = 'Service was removed';
                            }

                            if (modelJSON.stylist){
                                modelJSON.stylist = modelJSON.stylist.firstName + ' ' + modelJSON.stylist.lastName;
                            } else {
                                modelJSON.stylist = 'Stylist was removed'
                            }

                            return modelJSON;
                        });

                        cb(null, bookedAppointmentsArray);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.appointmentCount, data: result.appointment});
        });


    };

    this.getStylistClients = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/clients/:stylistId`__
         *
         * This __method__ allows get stylist clients for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/clients/563342cf1480ea7c109dc385
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *   total: 2,
         *   data: [
         *      {
         *          _id: "5649f4cbd50515f80a652526",
         *          bookingDate: "2015-11-09T11:17:50.060Z",
         *          client: "Petya Petrovich"
         *      },
         *      {
         *          _id: "564ef768122888ec1ee6f87b",
         *          bookingDate: "2015-11-08T10:17:50.060Z",
         *          client: "Petya Lyashenko"
         *      }
         *      ]
         *  }
         *
         * @method getStylistClients
         * @instance
         */

        var stylistId = req.params.stylistId;
        var query = req.query;
        var sortParam = query.sort;
        var page = (query.page >=1) ? query.page : 1;
        var order = (query.order === '1') ? 1 : -1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_CLIENTS;
        var sortObj = {};
        var projection = {
            bookingDate: 1,
            client: 1,
            rate: 1
        };

        var criteria = {
            'stylist.id': ObjectId(stylistId),
            status: {$ne : CONSTANTS.STATUSES.APPOINTMENT.CREATED}
        };

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(stylistId)){
            return next(badRequests.InvalidValue({value: stylistId, param: 'stylistId'}));
        }

        if (sortParam && sortParam !== 'client' && sortParam !== 'date') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'client' || !sortParam) {
            sortObj['client.firstName'] = order;
            sortObj['client.lastName'] = order;
        }

        if (sortParam === 'date') {
            sortObj.bookingDate = order;
        }

        async.parallel({
            appointmentCount: function(cb){
                Appointment
                    .count(criteria, function(err, count){
                        if (err){
                            return cb(err);
                        }

                        cb(null, count);
                    });
            },

            appointment: function(cb){

                Appointment
                    .find(criteria, projection)
                    .sort(sortObj)
                    .skip(limit * (page -1))
                    .limit(limit)
                    .exec(function(err, appointmentModelsArray){
                        var stylistClientsArray;

                        if (err){
                            return cb(err);
                        }

                        stylistClientsArray = appointmentModelsArray.map(function(model){
                            var modelJSON = model.toJSON();

                            if (modelJSON.client && modelJSON.client.firstName && modelJSON.client.lastName){
                                modelJSON.client = modelJSON.client.firstName + ' ' + modelJSON.client.lastName;
                            } else {
                                modelJSON.client = 'Client was removed'
                            }

                            return modelJSON;
                        });

                        cb(null, stylistClientsArray);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.appointmentCount, data: result.appointment});
        });


    };

    this.getStylistPayments = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/stylistPayments/`__
         *
         * This __method__ allows get stylist payments for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/stylistPayments/
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *   total: 2,
         *   data: [
         *      {
         *          _id: "5649f4cbd50515f80a652526",
         *          bookingDate: "2015-11-09T11:17:50.060Z",
         *          status: "Succeeded",
         *          serviceType: "Manicure",
         *          stylist: "Stylist Petrovich ",
         *          price: 20,
         *          stylistFullName: "Stylist Petrovich ",
         *          tip: "-"
         *      },
         *      {
         *          _id: "564ef768122888ec1ee6f87b",
         *          bookingDate: "2015-11-08T10:17:50.060Z",
         *          tip: 5,
         *          status: "Succeeded",
         *          serviceType: "Manicure",
         *          stylist: "Stylist Petrovich ",
         *          price: 20,
         *          stylistFullName: "Stylist Petrovich "
         *      }
         *      ]
         *   }
         *
         * @method getStylistPayments
         * @instance
         */

        var query = req.query;
        var sortParam = query.sort;
        var search = query.search;
        var page = (query.page >=1) ? query.page : 1;
        var order = (query.order === '1') ? 1 : -1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_CLIENTS;
        var sortObj = {};
        var searchRegExp;
        var searchObj = {};

        var projection = {
            bookingDate: 1,
            stylist: 1,
            serviceType: 1,
            price: 1,
            tip: 1,
            status: 1,
            'stylistFullName': {
                $concat: ['$stylist.firstName', ' ', '$stylist.lastName']

            }
        };

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');

            searchObj['$or'] = [
                {'stylist.firstName': {$regex: searchRegExp}},
                {'stylist.lastName': {$regex: searchRegExp}},
                {'stylistFullName': {$regex: searchRegExp}},
                {'serviceType.name': {$regex: searchRegExp}}
            ];
        }

        var criteria = {
            $and: [
                {
                    status: {$ne : CONSTANTS.STATUSES.APPOINTMENT.CREATED}
                },
                searchObj
            ]
        };

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (sortParam && sortParam !== 'stylist' && sortParam !== 'date' && sortParam !== 'service' && sortParam !== 'payment' && sortParam !== 'tip') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'date' || !sortParam) {
            sortObj.bookingDate = order;
        }

        if (sortParam === 'stylist') {
            sortObj['stylist.firstName'] = order;
            sortObj['stylist.lastName'] = order;
        }

        if (sortParam === 'service') {
            sortObj['serviceType.name'] = order;
        }

        if (sortParam === 'payment') {
            sortObj.price = order;
        }

        if (sortParam === 'tip') {
            sortObj.tip = order;
        }

        async.parallel({

            appointmentCount: function(cb){
                Appointment
                    .count(criteria, function(err, count){
                        if (err){
                            return cb(err);
                        }

                        cb(null, count);
                    });
            },

            appointment: function(cb){
                Appointment
                    .aggregate([
                        {
                            $project: projection
                        },
                        {
                            $match: criteria
                        },
                        {
                            $sort: sortObj
                        },
                        {
                            $skip: limit * (page -1)
                        },
                        {
                            $limit: +limit
                        }
                    ], function(err, appointmentModelsArray){
                        var stylistPaymentsArray;

                        if (err){
                            return cb(err);
                        }

                        stylistPaymentsArray = appointmentModelsArray.map(function(model){

                            if (model.stylist && model.stylist.firstName && model.stylist.lastName){
                                model.stylist = model.stylist.firstName + ' ' + model.stylist.lastName;
                            } else {
                                model.stylist = 'Stylist was removed'
                            }

                            if (model.serviceType && model.serviceType.name){
                                model.serviceType = model.serviceType.name;
                            } else {
                                model.serviceType = 'Service was removed';
                            }

                            if (!model.price){
                                model.price = '-';
                            }
                            if (!model.tip){
                                model.tip = '-';
                            }

                            return model;
                        });

                        cb(null, stylistPaymentsArray);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.appointmentCount, data: result.appointment});
        });


    };

    this.getClientSubscriptions = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/subscriptions/:clientId`__
         *
         * This __method__ allows get client subscriptions for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/subscriptions/5649f4cbd50515f80a652526
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *      total: 1,
         *      data: [
         *          {
         *          purchaseDate: "2015-11-20T10:20:43.275Z",
         *          package: "Unlimited Pass"
         *          }
         *      ]
         *  }
         *
         * @method getClientSubscriptions
         * @instance
         */

        var clientId = req.params.clientId;
        var query = req.query;
        var sortParam = query.sort;
        var page = (query.page >=1) ? query.page : 1;
        var order = (query.order === '1') ? 1 : -1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_PURCHASED_PACKAGES;
        var sortObj = {};
        var projection = {
            _id: 0,
            purchaseDate: 1,
            subscriptionType: 1
        };
        var criteria = {
            'client.id': ObjectId(clientId)
        };

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)){
            return next(badRequests.InvalidValue({value: clientId, param: 'id'}));
        }

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (sortParam && sortParam !== 'date' && sortParam !== 'package') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'date' || !sortParam) {
            sortObj.purchaseDate = order;
        }

        if (sortParam === 'package') {
            sortObj['subscriptionType.name'] = order;
        }

        async.parallel({

            subscriptionCount: function(cb){
                Subscription.count(criteria, function(err, count){
                    if (err){
                        return cb(err);
                    }

                    cb(null, count);
                });
            },

            subscriptions: function(cb){
                Subscription
                    .find(criteria, projection)
                    .sort(sortObj)
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .exec(function(err, subscriptionModelsArray){
                        var subscriptionArray;

                        if (err){
                            return cb(err)
                        }

                        subscriptionArray = subscriptionModelsArray.map(function(model){
                            var modelJSON = model.toJSON();

                            if (modelJSON.subscriptionType && modelJSON.subscriptionType.name){
                                modelJSON.package = modelJSON.subscriptionType.name;
                            } else {
                                modelJSON.package = 'Package was removed';
                            }

                            delete modelJSON.subscriptionType;

                            return modelJSON;
                        });

                        cb(null, subscriptionArray);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.subscriptionCount, data: result.subscriptions});
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
        var globalUserModel;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(userId)){
            return next(badRequests.InvalidValue({value: userId, param: 'id'}));
        }


        async.series([

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

                        globalUserModel = userModel.toJSON();

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
                Appointment.remove({$or: [{'client.id': userId}, {'stylist.id': userId}]}, cb);
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
            },

            function(cb){
                var customerId = globalUserModel.payments.customerId;

                if (!customerId){
                    return cb(null);
                }

                stripe
                    .deleteCustomer(customerId, cb)
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

    this.getStylistsLocation = function(req, res, next){



        var criteria = {
            role: CONSTANTS.USER_ROLE.STYLIST,
            online: true,
            'suspend.isSuspend': false,
            approved: true
        };
        var projection = {
            'personalInfo.firstName': 1,
            'personalInfo.lastName': 1,
            'personalInfo.avatar': 1,
            'salonInfo.salonName': 1,
            'salonInfo.address': 1,
            'salonInfo.city': 1,
            'salonInfo.state': 1,
            'salonInfo.country': 1,
            'salonInfo.zipCode': 1,
            loc: 1
        };

        User
            .find(criteria, projection, function(err, stylistModelsArray){
                var stylists;

                if (err){
                    return next(err);
                }

                if (!stylistModelsArray.length){
                    return res.status(200).send([]);
                }

                stylists = stylistModelsArray.map(function(model){
                    var modelJSON = model.toJSON();
                    var address;
                    var city;
                    var state;
                    var country;
                    var zipCode;

                    if (modelJSON.salonInfo){
                        if (modelJSON.salonInfo.salonName){
                            modelJSON.salon = modelJSON.salonInfo.salonName
                        } else {
                            modelJSON.salon = '';
                        }

                        address = modelJSON.salonInfo.address || '';
                        city = modelJSON.salonInfo.city || '';
                        state = modelJSON.salonInfo.state || '';
                        country = modelJSON.salonInfo.country || '';
                        zipCode = modelJSON.salonInfo.zipCode || '';

                        modelJSON.address = address + ', ' + city + ', ' + state + ', ' + country + ', ' + zipCode;

                        delete modelJSON.salonInfo
                    }

                    if (modelJSON.personalInfo){
                        modelJSON.name = modelJSON.personalInfo.firstName + ' ' + modelJSON.personalInfo.lastName;

                        if (modelJSON.personalInfo.avatar){
                            modelJSON.avatar = image.computeUrl(modelJSON.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                        } else {
                            modelJSON.avatar = '';
                        }

                        delete modelJSON.personalInfo;
                    }

                    return modelJSON;
                });

                res.status(200).send(stylists);

            });
    };

    function setZero (d){
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);

        return d;
    }

    function getBeginWeek(d) {
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    function getBeginMonth(d){
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    this.getOverviewByPeriod = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/statistic/overview`__
         *
         * This __method__ allows get statistic overview for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/statistic/overview?period=w
         *
         * @example Query parameter _period_ possible values (d, w, m)
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *       requestSent: 9,
         *       appointmentBooked: 2,
         *       packageSold: 7
         *  }
         *
         * @method getOverviewByPeriod
         * @instance
         */


        var date = new Date();
        var period = req.query.period || 'd';

        switch (period){
            case 'd': {
                date = setZero(date);
            }
                break;
            case 'w': {
                date = setZero(getBeginWeek(date));
            }
                break;
            case 'm': {
                date = getBeginMonth(date);
            }
                break;
            default: {
                date = setZero(date);
            }
        }

        async
            .parallel({
                requestSent: function (cb) {
                    Appointment
                        .count({requestDate: {$gte: date}})
                        .exec(cb);
                },

                appointmentBooked: function(cb){
                    Appointment
                        .count({requestDate: {$gte: date}, status: {$ne: CONSTANTS.STATUSES.APPOINTMENT.CREATED}})
                        .exec(cb);
                },

                packageSold: function(cb){
                    Subscription
                        .count({purchaseDate: {$gte: date}})
                        .exec(cb);
                }
            }, function(err, result){
                if (err){
                    return next(err);
                }

                res.status(200).send(result);
            });
    };

    this.getAppointmentsStatistic = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/statistic/appointments`__
         *
         * This __method__ allows get statistic for booked appointments for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/statistic/appointments
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *    [
         *        {
         *            _id: 11,
         *            count: 2
         *        }
         *    ]
         *
         * @method getAppointmentsStatistic
         * @instance
         */


        var currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var startOfYear = new Date(currentYear, 0, 1);

        Appointment
            .aggregate([
                {
                    $match: {
                        bookingDate: {$gte: startOfYear},
                        status: {
                            $ne: CONSTANTS.STATUSES.APPOINTMENT.CREATED
                        }
                    }
                },
                {
                    $group: {
                        _id: {$month: '$bookingDate'},
                        count: {$sum: 1}
                    }
                }
            ], function (err, resultModels) {
                if (err) {
                    return next(err);
                }

                res.status(200).send(resultModels);
            });
    };

    this.getMonthlyRevenue = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/statistic/revenue`__
         *
         * This __method__ allows get statistic monthly revenue for _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/statistic/revenue
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *    [
         *      {
         *          "_id": 10,
         *          "total": 38.54
         *      },
         *      {
         *          "_id": 11,
         *          "total": 154.16
         *      }
         *    ]
         *
         * @method getMonthlyRevenue
         * @instance
         */

        var currentDate = new Date();
        var currentYear = currentDate.getFullYear();
        var startOfYear = new Date(currentYear, 0, 1);

        Payments
            .aggregate([
                {
                    $match: {
                        date: {$gte: startOfYear},
                        totalAmount: {$gte: 0}
                    }
                },
                {
                    $group: {
                        _id: {$month: '$date'},
                        total: {$sum: {$divide: ['$totalAmount', 100]}}
                    }
                }
            ], function (err, resultModels) {
                if (err) {
                    return next(err);
                }

                res.status(200).send(resultModels);
            });

    };

    this.getInboxList = function(req, res, next){
        var query = req.query;
        var sortParam = query.sort;
        var search = query.search;
        var page = (query.page >=1) ? query.page : 1;
        var order = (query.order === '1') ? 1 : -1;
        var limit = (query.limit >= 1) ? query.limit : CONSTANTS.LIMIT.REQUESTED_INBOX;
        var sortObj = {};
        var searchRegExp;
        var criteria = {};

        var projection = {
            __v: 0,
            message: 0,
            createdAt: 0
        };

        if (search){
            searchRegExp = new RegExp('.*' + search + '.*', 'ig');

            criteria['$or'] = [
                {'name': {$regex: searchRegExp}},
                {'email': {$regex: searchRegExp}},
                {'subject': {$regex: searchRegExp}}
            ];
        }

        if (sortParam){
            sortParam = sortParam.toLowerCase();
        }

        if (sortParam && sortParam !== 'name' && sortParam !== 'email' && sortParam !== 'subject') {
            return next(badRequests.InvalidValue({value: sortParam, param: 'sort'}))
        }

        if (sortParam === 'name' || !sortParam) {
            sortObj.name = order;
        }

        if (sortParam === 'email') {
            sortObj.email = order;
        }

        if (sortParam === 'subject') {
            sortObj.subject = order;
        }

        async.parallel({

            inboxCount: function(cb){
                Inbox
                    .count(criteria, function(err, count){
                        if (err){
                            return cb(err);
                        }

                        cb(null, count);
                    });
            },

            inbox: function(cb){
                Inbox
                    .find(criteria, projection)
                    .sort(sortObj)
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .exec(function(err, inboxModelsArray){
                        if (err){
                            return cb(err);
                        }

                        cb(null, inboxModelsArray);
                    });
            }

        }, function(err, result){
            if (err){
                return next(err);
            }

            res.status(200).send({total: result.inboxCount, data: result.inbox});
        });
    };

    this.getInboxById = function(req, res, next){
        var id = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(id)){
            return next(badRequests.InvalidValue({value: id, param: 'id'}));
        }

        Inbox
            .findOne({_id: id}, {__v: 0}, function(err, inboxModel){
                if (err){
                    return next(err);
                }

                if (!inboxModel){
                    return next(badRequests.NotFound({target: 'Inbox'}));
                }

                res.status(200).send(inboxModel);
            });
    };

    this.createInbox = function(req, res, next){
        var body = req.body;
        var name = body.name;
        var email = body.email;
        var subject = body.subject;
        var message = body.message;
        var createObj;
        var inboxModel;

        if (!name || !email || !subject || !message){
            return next(badRequests.NotEnParams({reqParams: 'name and email and subject and message'}));
        }

        if (!validator.isEmail(email)) {
            return next(badRequests.InvalidEmail());
        }

        createObj = {
            name: name,
            email: email,
            subject: subject,
            message: message
        };

        inboxModel = new Inbox(createObj);

        inboxModel
            .save(function(err){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Inbox created successfully'});
            });
    };

    this.removeInbox = function(req, res, next){
        var body = req.body;
        var ids;

        if (!body.ids) {
            return next(badRequests.NotEnParams({reqParams: 'ids'}));
        }

        ids = body.ids.toObjectId();

        Inbox
            .remove({_id: {$in: ids}}, function (err) {
                if (err) {
                    return next(err);
                }

                res.status(200).send({success: 'Inbox deleted successfully'});

            });
    };

    this.createPhotoToGallery = function(req, res, next){
        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/gallery`__
         *
         * This __method__ allows to add photo to gallery by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/gallery
         *
         * @example Body example:
         *
         *  {
         *      "clientId":"5644a3453f00c1f81c25b548",
         *      "stylistId":"5644a3453f00c1f81c25b549",
         *      "serviceType":"5644a3453f00c1f81c25b550",
         *      "bookingDate": "2015-11-08T10:17:50.060Z",
         *      "image": "data:image/png;base64, /9j/4AAQSkZJRgABAQA..."
         *  }
         *
         * @param {string} clientId - Client id
         * @param {string} stylistId - Stylist id
         * @param {string} serviceType - Service type id
         * @param {date} bookingDate - date when photo was shot
         * @param {string} image - base64
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Your photo was added to gallery"
         *  }
         *
         * @method createPhotoToGallery
         * @instance
         */

        var body = req.body;
        var clientId = body.clientId;
        var stylistId = body.stylistId;
        var serviceType = body.serviceType;
        var bookingDate = body.bookingDate;
        var imageString = body.image;
        var saveObj;
        var galleryModel;

        if (!clientId || !stylistId || !serviceType || !bookingDate || !imageString) {
            return next(badRequests.NotEnParams({reqParams: 'clientId and stylistId and serviceType and bookingDate and image'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(clientId)) {
            return next(badRequests.InvalidValue({value: clientId, param: 'clientId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(stylistId)) {
            return next(badRequests.InvalidValue({value: stylistId, param: 'stylistId'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(serviceType)) {
            return next(badRequests.InvalidValue({value: serviceType, param: 'serviceType'}));
        }

        saveObj = {
            client: ObjectId(clientId),
            stylist: ObjectId(stylistId),
            serviceType: ObjectId(serviceType),
            bookingDate: bookingDate,
            status: CONSTANTS.STATUSES.GALLERY.APPROVED
        };

        galleryModel = new Gallery(saveObj);

        galleryModel
            .save(function (err) {
                var imageName;

                if (err) {
                    return next(err);
                }

                imageName = galleryModel.get('_id').toString();

                image.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, function (err) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send({success: 'Your photo was added to gallery', photoId: imageName});
                });
            });
    };

    this.acceptPhotoFromGallery = function(req, res, next){
        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/gallery/:id`__
         *
         * This __method__ allows to accept photo from gallery by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/gallery/56541f998cb50b2807ba8f8c
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Photo was accepted successfully"
         *  }
         *
         * @method acceptPhotoFromGallery
         * @instance
         */

        var id = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(id)){
            return next(badRequests.InvalidValue({value: id, param: 'id'}));
        }

        Gallery
            .findOneAndUpdate({_id: id}, {$set: {status: CONSTANTS.STATUSES.GALLERY.APPROVED, message: ''}}, function (err, galleryModel) {
                if (err) {
                    return next(err);
                }

                if (!galleryModel){
                    return next(badRequests.NotFound({target: 'Photo'}));
                }

                res.status(200).send({success: 'Photo was accepted successfully'});
            });
    };

    this.removePhotoFromGallery = function(req, res, next){

        /**
         * __Type__ __`DELETE`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/admin/gallery/:id`__
         *
         * This __method__ allows delete _User_ photo from gallery by _Admin_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/admin/gallery/564f0abd122888ec1ee6f87d
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Photo was removed from gallery"
         *  }
         *
         * @method removePhotoFromGallery
         * @instance
         */

        var imageName = req.params.id;
        var criteria = {_id: imageName};

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(imageName)){
            return next(badRequests.InvalidValue({value: imageName, param: 'id'}));
        }

        async.waterfall([

            function(cb){
                Gallery
                    .findOne(criteria, function(err, imageModel){
                        if (err){
                            return cb(err);
                        }

                        if (!imageModel){
                            return cb(badRequests.NotFound({target: 'Photo'}));
                        }

                        cb(null, imageModel);
                    });
            },

            function(imageModel, cb){
                imageModel.remove(function(err){
                    if (err){
                        return cb(err);
                    }

                    cb();
                });
            },

            function(cb){
                image.deleteImage(imageName, CONSTANTS.BUCKET.IMAGES, cb);
            }

        ], function(err){
            if (err){
                return next(err);
            }

            res.status(200).send({success: 'Photo was removed from gallery'});
        });
    };


    //payments

    this.createTransfer = function(req, res, next){
        var body = req.body;
        var stylistId = body.stylistId;
        var amount = body.amount;
        var currency = body.currency;
        var statement_descriptor = body.statementDescriptor;

        if (!stylistId || !amount || !currency || !statement_descriptor){
            return next(badRequests.NotEnParams());
        }

        async
            .waterfall([
                function(cb){
                   User
                       .findOne({_id: stylistId}, {'payments.recipientId': 1})
                       .exec(function(err, resultModel){

                           if (err){
                               return cb(err);
                           }

                           if (!resultModel){
                               err = new Error('User not found');
                               err.status = 400;
                               return cb(err);
                           }


                           cb(null, resultModel.payments.recipientId);
                       });
                },

                function(recipientId, cb){
                    var data = {
                        amount: amount,
                        currency: currency,
                        recipient: recipientId,
                        statement_descriptor: statement_descriptor
                    };

                    stripe.createTransfer(data, cb);

                }
            ], function(err, transfer){
                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Transfer succeed', transfer: transfer});
            });
    };

    this.getTransfer = function (req, res, next){
        var transferId = req.params.transferId;

        stripe
            .getTransfers(transferId, function(err, transfer){

                if (err){
                    return next(err);
                }

                res.status(200).send(transfer);
            });
    };


};

module.exports = AdminHandler;