module.exports = function(){

    var _ = require('underscore');
    var nodemailer = require('nodemailer');

    var fs = require('fs');

    var confirmAccountHTML = fs.readFileSync('public/templates/mailer/createUser.html', encoding = "utf-8");
    var changePassHTML = fs.readFileSync('public/templates/mailer/changePassword.html', encoding = "utf-8");

    var confirmAccountTemplate = _.template(confirmAccountHTML);
    var changePasswordTemplate = _.template(changePassHTML);

    function confirmRegistration (options){

        var templateOptions = {
            name: options.name,
            email: options.email,
            password: options.password,
            url: process.env.HOST + '/users/confirm/' + options.token
        };

        var mailOptions = {
            from: 'Misha <no-replay@misha.com>',
            to: options.email,
            subject: 'User verification',
            generateTextFromHTML: true,
            html: confirmAccountTemplate(templateOptions)
        };

        sendEmail(mailOptions);

    }

    function forgotPassword (options){
        var templateOptions = {
            email: options.email,
            url: process.env.HOST + '/users/passwordChange/' + options.forgotToken
        };

        var mailOptions = {
            from: 'Misha <no-replay@misha.com>',
            to: templateOptions.email,
            subject: 'Change password',
            generateTextFromHTML: true,
            html: changePasswordTemplate(templateOptions)
        };

        sendEmail(mailOptions);
    }

    function sendEmail(mailOptions, callback){

        var transport = nodemailer.createTransport({service: 'SendGrid', auth: {user: 'mmmigalll', pass: 'mishavashkeba1991'}});

        if (callback && typeof callback === 'function'){

            transport.sendMail(mailOptions, function(err, info){

                if (err){
                    return callback(err);
                }

                callback(null, info);

            });

        } else {
            transport.sendMail(mailOptions, function(err, info){

                if (err){
                    return console.log(err);
                }

                console.log('Email sent');
            });
        }
    }

    return {
        confirmRegistration: confirmRegistration
    }
};