
/**
 * @description Business profile management module
 * @module businessProfile
 *
 */

var mailer = require('../helpers/mailer')();
var mongoose = require('mongoose');
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var CONSTANTS = require('../constants');
var async = require('async');
var ImageHandler = require('./image');
var _ = require('lodash');
var ObjectId = mongoose.Types.ObjectId;


var BusinessHandler = function (app, db) {

    var Business = db.model('Business');
    var Appointment = db.model('Appointment');
    var ServiceType = db.model('ServiceType');
    var Services = db.model('Service');

    var session = new SessionHandler();
    var image = new ImageHandler();

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    }

    this.signIn = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/signIn/`__
         *
         * This __method__ allows signIn _Businness_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/signIn/
         *
         * @example Body example:
         *
         * If you want login via Facebook
         * {
         *      "fbId": "test1"
         * }
         *
         * If you want login via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         *  {
         *      "success": "Login successful"
         *  }
         *
         * @param {string} [fbId] - FaceBook Id for signing `Business`
         * @param {string} [email] - `Business` email
         * @param {string} password - `Business` password
         *
         * @method signIn
         * @instance
         */

        var options = req.body;

        var fbId;
        var email;
        var password;

        if (options.fbId) {

            fbId = options.fbId;

            Business
                .findOne({fbId: fbId}, function (err, businessModel) {
                    if (err) {
                        return next(err);
                    }

                    if (!businessModel) {
                        return next(badRequests.SignInError());
                    }

                    session.register(req, res, businessModel._id, false, CONSTANTS.USER_STATUS.BUSINESS);
                });

        } else {

            if (!options.email || !options.password) {
                return next(badRequests.NotEnParams({reqParams: 'email and password or fbId'}));
            }

            email = options.email;
            password = getEncryptedPass(options.password);

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            Business
                .findOneAndUpdate({email: email, password: password}, {forgotToken: ''}, function (err, businessModel) {
                    var token;

                    if (err) {
                        return next(err);
                    }

                    if (!businessModel) {
                        return next(badRequests.SignInError());
                    }

                    token = businessModel.get('token');

                    if (token){
                        return next(badRequests.UnconfirmedEmail());
                    }

                    session.register(req, res, businessModel._id, false, CONSTANTS.USER_STATUS.BUSINESS);
                });
        }
    };

    this.signUp = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/signUp/`__
         *
         * This __method__ allows signUp _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/signUp/
         *
         * @example Body example:
         *
         * If you want signUp via Facebook
         * {
         *      "fbId": "test1",
         *      "name": "Test"
         * }
         *
         * If you want signUp via email
         *
         * {
         *      "email": "test@test.com",
         *      "password": "qwerty",
         *      "firstName": "Test",
         *      "lastName": "Test",
         * }
         *
         * @example Response example:
         *
         * Response status: 201
         *
         * For signUp via Facebook
         *  {
         *      "success": "Business created successful"
         *  }
         *
         *  For signUp via Email
         *
         *  {
         *      "success": "Business created successful. For using your account you must verify it. Please check email."
         *  }
         *
         * @param {string} [fbId] - FaceBook Id for signing user
         * @param {string} [email] - `Business` email
         * @param {string} password - `Business` password
         * @param {string} firstName - `Business` firstName
         * @param {string} lastName - `Business` lastName
         *
         * @method signUp
         * @instance
         */

        var body = req.body;
        var token = uuid.v4();
        var email;
        var businessModel;
        var password;
        var createObj;

        if (body.fbId){

            businessModel = new Business(body);

            businessModel
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }

                    if (body.name) {
                        name = body.name;
                    }

                    //res.status(200).send({success: 'User registered successfully'});
                    session.register(req, res, businessModel._id, true, CONSTANTS.USER_STATUS.BUSINESS);

                });

        } else {
            if (!body.password || !body.email || !body.firstName || !body.lastName) {
                return next(badRequests.NotEnParams({reqParams: 'password or email or First name or Last name'}));
            }

            email = body.email;
            password = body.password;

            if (!validator.isEmail(email)) {
                return next(badRequests.InvalidEmail());
            }

            email = validator.escape(email);

            createObj = {
                personalInfo: {
                    firstName: body.firstName,
                    lastName: body.lastName
                },
                email: email,
                password: getEncryptedPass(password),
                token: token
            };

            businessModel = new Business(createObj);

            businessModel
                .save(function (err) {

                    if (err) {
                        return next(err);
                    }

                    if (body.name) {
                        name = body.name;
                    }

                    mailer.confirmRegistration({
                        name: body.firstName + ' ' + body.lastName,
                        email: body.email,
                        password: password,
                        token: token
                    }, CONSTANTS.USER_STATUS.BUSINESS.toLowerCase());

                    res.status(200).send({success: 'Business created successful. For using your account you must verify it. Please check email.'});

                });
        }

    };

    this.confirmRegistration = function (req, res, next) {

        var token = req.params.token;
        var uId;

        Business
            .findOneAndUpdate({token: token}, {
                $set: {
                    token: '',
                    confirmed: new Date()
                }
            }, {new: true}, function (err, userModel) {

                if (err) {
                    return next(err);
                }

                if (!userModel){
                    return next();
                }

                uId = userModel.get('_id');

                session.register(req, res, uId, true, CONSTANTS.USER_STATUS.BUSINESS);

            });


    };

    this.forgotPassword = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/forgotPassword/`__
         *
         * This __method__ allows make link to change password for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/forgotPassword/
         *
         * @example Body example:
         *
         * {
         *      "email": "test@test.com"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         * {
         *      "success": "Check your email"
         * }
         *
         * @param {string} email - `Business` email
         *
         * @method forgotPassword
         * @instance
         */

        var body = req.body;
        var email;
        var forgotToken = uuid.v4();

        if (!body.email) {
            return next(badRequests.NotEnParams({params: 'email'}));
        }

        if (!validator.isEmail(body.email)) {
            return next(badRequests.InvalidEmail());
        }

        email = body.email;

        email = validator.escape(email);

        body.email = email;
        body.forgotToken = forgotToken;

        Business
            .findOneAndUpdate(
            {
                email: email
            }, {
                $set: {forgotToken: forgotToken}
            }, {
                new: true
            }, function (err, result) {

                if (err) {
                    return next(err);
                }

                if (!result){
                    return res.status(200).send({success: 'Check your email'});
                }

                mailer.forgotPassword({
                        name: result.salonDetails.firstName + ' ' + result.salonDetails.lastName,
                        email: result.email,
                        forgotToken: result.forgotToken
                    },
                    CONSTANTS.USER_STATUS.BUSINESS.toLowerCase());

                res.status(200).send({success: 'Check your email'});

            });

    };

    this.confirmForgotPass = function(req, res, next){
        var forgotToken = req.params.forgotToken;

        Business
            .findOneAndUpdate({forgotToken: forgotToken}, {forgotToken: ''}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Confirm change password'});

            });

    };

    this.changePassword = function (req, res, next) {

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/passwordChange/:forgotToken`__
         *
         * This __method__ allows change password for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/passwordChange/bfcbd0c5-69e8-490c-ae61-701702c8e04f
         *
         * @example Body example:
         *
         * {
         *      "password": "qwerty"
         * }
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *      "success": "Password changed successfully"
         * }
         *
         * @param {string} password - `Business` password
         *
         * @method changePassword
         * @instance
         */

        var forgotToken = req.params.forgotToken;
        var body = req.body;
        var encryptedPassword;

        if (!body.password){
            return next(badRequests.NotEnParams({params: 'password'}));
        }

        encryptedPassword = getEncryptedPass(body.password);

        Business
            .findOneAndUpdate({forgotToken: forgotToken}, {password: encryptedPassword, forgotToken: ''}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Password changed successfully'});

            });

    };

    this.signOut = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/passwordChange/:forgotToken`__
         *
         * This __method__ allows signOut _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/signOut
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *      "success": "Logout successful"
         * }
         *
         * @method signOut
         * @instance
         */


        session.kill(req, res, next);
    };

    this.updatePersonalInfo = function(req, res, next){

        /**
         * __Type__ __`POST`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details`__
         *
         * This __method__ allows add details for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details
         *
         * @example Body example:
         *
         * {
         *    "salonName": "Misha",
         *    "address": "Uzhgorod, Gvardijska 19",
         *    "state": "Zakarpatska",
         *    "zipCode": "88000",
         *    "phone": "+380968987567",
         *    "licenseNumber": "1224"
         * }
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "success": "Business details saved successful"
         * }
         *
         * @param {string} salonName - `Business` Salon Name
         * @param {string} address - `Business` Salon Address
         * @param {string} state - `Business` Salon State
         * @param {string} zipCode - `Business` Zip Code
         * @param {string} phone - `Business` Phone Number
         * @param {string} licenseNumber - `Business` License Number
         *
         * @method addBusinessDetails
         * @instance
         */

        var uId = req.session.uId;
        var body = req.body;
        var personalInfo;

        if (!body){
            return next(badRequests.NotEnParams());
        }

        Business
            .findOne({_id: uId}, {personalInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                personalInfo = (resultModel.toJSON()).personalInfo;

                if (body.firstName){
                     personalInfo.firstName = body.firstName;
                }

                if (body.lastName){
                    personalInfo.lastName = body.lastName;
                }

                if (body.profession){
                    personalInfo.profession = body.profession;
                }

                if (body.personalPhoneNumber){
                    personalInfo.phoneNumber = body.personalPhoneNumber;
                }

                if (body.facebookURL){
                    personalInfo.facebookURL = body.facebookURL;
                }

                resultModel.update({personalInfo: personalInfo}, function(err){

                    if (err){
                        return next(err);
                    }


                    res.status(200).send({success: 'Personal info updated successfully'});
                });

            });

    };

    this.updateSalonInfo = function(req, res, next){

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details`__
         *
         * This __method__ allows update details for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details
         *
         * @example Body example:
         *
         * {
         *    "salonName": "Misha",
         *    "address": "Uzhgorod, Gvardijska 19",
         *    "state": "Zakarpatska",
         *    "zipCode": "88000",
         *    "phone": "+380968987567",
         *    "licenseNumber": "1224"
         * }
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "success": "Business details saved successful"
         * }
         *
         * @param {string} [salonName] - `Business` Salon Name
         * @param {string} [address] - `Business` Salon Address
         * @param {string} [state] - `Business` Salon State
         * @param {string} [zipCode] - `Business` Zip Code
         * @param {string} [phone] - `Business` Phone Number
         * @param {string} [licenseNumber] - `Business` License Number
         *
         * @method updateBusinessDetails
         * @instance
         */

        var uId = req.session.uId;
        var body = req.body;
        var currentSalonDetails;

        Business
            .findOne({_id: uId}, {salonInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                currentSalonDetails = resultModel.get('salonInfo');

                if (body.salonName){
                    currentSalonDetails.salonName = body.salonName;
                }

                if (body.yourBusinessRole){
                    currentSalonDetails.yourBusinessRole = body.yourBusinessRole;
                }

                if (body.phoneNumber){
                    currentSalonDetails.phoneNumber = body.phoneNumber;
                }

                if (body.email){
                    currentSalonDetails.email = body.email;
                }

                if (body.address){
                    currentSalonDetails.address = body.address;
                }

                if (body.state){
                    currentSalonDetails.state = body.state;
                }

                if (body.zipCode){
                    currentSalonDetails.zipCode = body.zipCode;
                }

                if (body.phone){
                    currentSalonDetails.phone = body.phone;
                }

                if (body.licenseNumber){
                    currentSalonDetails.licenseNumber = body.licenseNumber;
                }

                if (body.city){
                    currentSalonDetails.city = body.city;
                }

                if (body.country){
                    currentSalonDetails.country = body.country;
                }

                resultModel.update({salonInfo: currentSalonDetails}, function(err){

                    if (err){
                        return next(err);
                    }

                    res.status(200).send({success: 'Business details updated successful'});

                });

            });


    };

    this.getStylistInfo = function(req, res, next){

        /**
         * __Type__ __`GET`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details`__
         *
         * This __method__ allows get details for _Business_
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details
         *
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "_id": "5628d12da8087993131ba2cc",
         *     "salonDetails": {
         *         "licenseNumber": "1224",
         *         "phone": "+380968571460",
         *         "zipCode": "88000",
         *         "state": "Zakarpatska",
         *         "address": "Uzhgorod, Gvardijska 19",
         *         "salonName": "Misha",
         *         "logo": "http://projects.thinkmobiles.com:8871/uploads/development/images/5629d6c42096d3770def73d2.png",
         *         "stylists": []
         *     }
         * }
         *
         * @method getBusinessDetails
         * @instance
         */

        var uId = req.session.uId;
        var avatar;
        var viewModel;

        Business
            .findOne({_id: uId}, {personalInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                viewModel = resultModel.toJSON();

                if (viewModel.personalInfo.avatar){
                    avatar = image.computeUrl(viewModel.personalInfo.avatar, CONSTANTS.BUCKET.IMAGES);
                    viewModel.personalInfo.avatar = {
                        avatarName: viewModel.personalInfo.avatar,
                        url: avatar
                    };
                }

                res.status(200).send(viewModel);

            });
    };

    this.getSalonInfo = function(req, res, next){

        var uId = req.session.uId;

        Business
            .findOne({_id: uId}, {salonInfo: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                res.status(200).send(resultModel.toJSON());

            });

    };

    this.uploadStylistAvatar = function(req, res, next){

        /**
         * __Type__ __`PUT`__
         *
         * __Content-Type__ `application/json`
         *
         * __HOST: `http://projects.thinkmobiles.com:8871`__
         *
         * __URL: `/business/details/logo`__
         *
         * This __method__ allows upload logo for _Business_ Salon
         *
         * @example Request example:
         *         http://projects.thinkmobiles.com:8871/business/details/logo
         *
         * @example Body example:
         *
         * {
         *      "logo": "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAQDAw..."
         * }
         * @example Response example:
         *
         *  Response status: 200
         *
         * {
         *     "success": "Logo upload successful"
         * }
         *
         * @param {string } logo  - `Business` logo (`Base64`)
         *
         * @method uploadSalonLogo
         * @instance
         */

        var uId = req.session.uId;

        var body = req.body;
        var imageName = image.createImageName();
        var currentImageName;
        var imageString;

        if (!body || !body.avatar){
            return next(badRequests.NotEnParams({reqParams: 'avatar'}));
        }

        imageString = body.avatar;

        Business
            .findOne({_id: uId}, {'personalInfo.avatar': 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                currentImageName = resultModel.get('personalInfo.avatar');

                async
                    .series([
                        function(cb) {
                            
                            if (!currentImageName){
                                return cb();
                            }

                            image.deleteImage(currentImageName, CONSTANTS.BUCKET.IMAGES, cb);

                        },

                        function(cb) {
                            image.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb){
                            Business
                                .findOneAndUpdate({_id: uId}, {'personalInfo.avatar': imageName}, cb);
                        }

                    ], function(err){
                       
                        if (err){
                            return next(err);
                        }
                        
                        res.status(200).send({success: 'Avatar upload successful'});
                        
                    });

            });

    };

    this.getBusinessService = function(req, res, next){

        var uId = req.session.uId;
        var ind;
        var allId;
        var stylistId;
        var serviceArray = [];
        var serviceObj;

        ServiceType.find({}, function(err, allServiceModels){

            if (err){
                return next(err);
            }

            Services
                .find({stylist: uId}, function(err, stylistServiceModel){

                    if (err){
                        return next(err);
                    }

                    allId = _.map(_.pluck(allServiceModels, '_id'), function(id){
                        return id.toString();
                    });

                    stylistId = _.map(_.pluck(stylistServiceModel, 'serviceId'), function(id){
                        return id.toString();
                    });

                    for (var i = 0, n = allServiceModels.length; i < n; i++){
                        ind = stylistId.indexOf(allId[i]);

                        if (ind !== -1){
                            serviceObj = {
                                id: stylistServiceModel[ind].serviceId,
                                name: stylistServiceModel[ind].name,
                                status: stylistServiceModel[ind].approved ? 'approved' : 'pending'
                            };

                            serviceArray.push(serviceObj);
                        } else {
                            serviceObj = {
                                id: allServiceModels[i]._id,
                                name: allServiceModels[i].name,
                                status: 'new'
                            };

                            serviceArray.push(serviceObj);
                        }

                    }

                    res.status(200).send(serviceArray);

                });

        });

    };

    this.sendRequestForService = function(req, res, next){

        var uId = req.session.uId;
        var serviceId = req.params.id;
        var serviceModel;
        var name;
        var createObj;

        ServiceType.findOne({_id: serviceId}, {name: 1}, function(err, resultModel){

            if (err){
               return next(err);
            }

            if (!resultModel){
                return next(badRequests.DatabaseError());
            }

            name = resultModel.get('name');

            Services
                .findOne({stylist: ObjectId(uId), name: name}, function(err, resultModel){

                    if (err){
                        return next(err);
                    }

                    if (resultModel){
                        return res.status(200).send({success: 'You have already requested this service'});
                    }

                    createObj = {
                        name: name,
                        stylist: ObjectId(uId),
                        serviceId: serviceId
                    };

                    serviceModel = new Services(createObj);

                    serviceModel
                        .save(function(err){

                            if (err){
                                return next(err);
                            }

                            res.status(200).send({success: 'request succeed'});

                        });

                });
        });
    }
    };

    this.getBusinessAppointmentById = function(req, res, next){
        var appointmentId = req.params.id;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'id'}));
        }

        Appointment
            .findOne({_id: appointmentId}, {__v: 0, stylist: 0, status: 0, requestDate: 0})
            .populate({path:'client', select: 'clientDetails.firstName clientDetails.lastName clientDetails.avatar clientDetails.phone'})
            .populate({path: 'serviceType', select: 'name'})
            .exec(function(err, appointmentModel){
                var clientAvatarName;

                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                clientAvatarName = appointmentModel.get('client.clientDetails.avatar');

                if (clientAvatarName){
                    appointmentModel.client.clientDetails.avatar = image.computeUrl(clientAvatarName, CONSTANTS.BUCKET.IMAGES);
                }

                res.status(200).send(appointmentModel);
            });
    };

    this.cancelByStylist = function(req, res, next){
        var stylistId = req.session.uId;
        var appointmentId = req.body.appointmentId;
        var cancellationReason = req.body.cancellationReason;

        if (!appointmentId || !cancellationReason){
            return next(badRequests.NotEnParams({reqParams: 'appointmentId and cancellationReason'}));
        }

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        Appointment
            .findOneAndUpdate(
            {_id: appointmentId, stylist: stylistId},
            {$set: {status: CONSTANTS.STATUSES.APPOINTMENT.CANCEL_BY_STYLIST, cancellationReason: cancellationReason}},
            function(err, appointmentModel){
                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment was canceled by stylist successfully'});
            });
    };

    this.getAllStylistAppointments = function(req, res, next){
        var stylistId = req.session.uId;

        Appointment
            .find({stylist: stylistId}, {__v: 0, client: 0, clientLoc: 0, stylist: 0, requestDate: 0, status: 0})
            .populate({path: 'serviceType', select: 'name'})
            .sort({bookingDate: 1})
            .exec(function(err, appointmentModelsArray){
                if (err){
                    return next(err);
                }

                if (!appointmentModelsArray.length){
                    return next(badRequests.NotFound({target: 'Appointments'}));
                }

                res.status(200).send(appointmentModelsArray);
            });
    };

    this.startAppointmentById = function(req, res, next){
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            startDate: new Date(),
            status: CONSTANTS.STATUSES.APPOINTMENT.BEGINS

        };

        Appointment
            .findOneAndUpdate({_id: appointmentId, stylist: stylistId}, updateObj, function(err, appointmentModel){
                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment begins successfully'});
            });
    };

    this.finishAppointmentById = function(req, res, next){
        var stylistId = req.session.uId;
        var appointmentId = req.params.id;
        var updateObj;

        if (!CONSTANTS.REG_EXP.OBJECT_ID.test(appointmentId)){
            return next(badRequests.InvalidValue({value: appointmentId, param: 'appointmentId'}));
        }

        updateObj = {
            endDate: new Date(),
            status: CONSTANTS.STATUSES.APPOINTMENT.SUCCEEDED

        };

        Appointment
            .findOneAndUpdate({_id: appointmentId, stylist: stylistId}, updateObj, function(err, appointmentModel){
                if (err){
                    return next(err);
                }

                if (!appointmentModel){
                    return next(badRequests.NotFound({target: 'Appointment'}));
                }

                res.status(200).send({success: 'Appointment begins successfully'});
            });
    };



};

module.exports = BusinessHandler;
