
/**
 * @description Business profile management module
 * @module businessProfile
 *
 */

var mailer = require('../helpers/mailer')();
var validator = require('validator');
var uuid = require('uuid');
var badRequests = require('../helpers/badRequests');
var crypto = require('crypto');
var SessionHandler = require('./sessions');
var CONSTANTS = require('../constants');
var async = require('async');
var ImageHandler = require('./image');


var BusinessHandler = function (app, db) {

    var Business = db.model('Business');
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
        var firstName;
        var lastName;

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

            body.token = token;
            body.email = email;
            body.password = getEncryptedPass(password);

            businessModel = new Business(body);

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

    this.addBusinessDetails = function(req, res, next){

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

        if (!body || !body.salonName || !body.address || !body.state || !body.zipCode || !body.phone || !body.licenseNumber){
            return next(badRequests.NotEnParams({reqParams: 'Salon name or Business address or State or Zipcode or Phone Number or License Number'}));
        }

        Business
            .findOneAndUpdate({_id: uId}, {salonDetails: body}, function(err){

                if (err){
                    return next(err);
                }

                res.status(200).send({success: 'Business details saved successful'});
            })

    };

    this.updateBusinessDetails = function(req, res, next){

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
            .findOne({_id: uId}, {salonDetails: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                currentSalonDetails = resultModel.get('salonDetails');

                if (body.salonName){
                    currentSalonDetails.salonName = body.salonName;
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

                resultModel.update({$set: {salonDetails: currentSalonDetails}}, function(err){

                    if (err){
                        return next(err);
                    }

                    res.status(200).send({success: 'Business details updated successful'});

                });

            });


    };

    this.getSalonDetails = function(req, res, next){

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
        var logo;
        var viewModel;

        Business
            .findOne({_id: uId}, {salonDetails: 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                viewModel = resultModel.toJSON();

                if (viewModel.salonDetails.logo){
                    logo = image.computeUrl(viewModel.salonDetails.logo, CONSTANTS.BUCKET.IMAGES);
                    viewModel.salonDetails.logo = logo;
                }

                res.status(200).send(viewModel);

            });
    };


    this.uploadSalonLogo = function(req, res, next){

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

        if (!body || !body.logo){
            return next(badRequests.NotEnParams({reqParams: 'logo'}));
        }

        imageString = body.logo;

        Business
            .findOne({_id: uId}, {'salonDetails.logo': 1}, function(err, resultModel){

                if (err){
                    return next(err);
                }

                if (!resultModel){
                    return next(badRequests.DatabaseError());
                }

                currentImageName = resultModel.get('salonDetails.logo');

                async
                    .series([
                        function(cb) {
                            
                            if (!currentImageName){
                                return cb();
                            }

                            image.deleteImage(currentImageName,CONSTANTS.BUCKET.IMAGES, cb);

                        },

                        function(cb) {
                            image.uploadImage(imageString, imageName, CONSTANTS.BUCKET.IMAGES, cb);
                        },

                        function(cb){
                            Business
                                .findOneAndUpdate({_id: uId}, {'salonDetails.logo': imageName}, cb);
                        }

                    ], function(err){
                       
                        if (err){
                            return next(err);
                        }
                        
                        res.status(200).send({success: 'Logo upload successful'});
                        
                    });

            });

    }



};

module.exports = BusinessHandler;
