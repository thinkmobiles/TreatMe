
module.exports = function (app, db) {
    var ServiceType = db.model('ServiceType');

    var logWriter = require('../modules/logWriter')();

    var clientsRouter = require('./clients')(app, db);
    var adminRouter = require('./admin')(db);
    var stylistRouter = require('./stylist')(app, db);

    var SubscriptionHandler = require('../handlers/subscription');
    var UserHandler = require('../handlers/users');
    var SessionHandler = require('../handlers/sessions');

    var subscriptionHandler = new SubscriptionHandler(db);
    var user = new UserHandler(app, db);
    var sessionHandler = new SessionHandler(db);

    /*app.get('/', function (req, res, next) {
        res.status(200).send('Express start succeed');
    });*/

    app.get('/', function (req, res, next) {
        res.sendfile('index.html');
    });

    app.use('/client', clientsRouter);
    app.use('/admin', adminRouter);
    app.use('/stylist', stylistRouter);

    app.post('/signUp', user.signUp);
    app.post('/signIn', user.signIn);
    app.get('/signOut', user.signOut);

    app.put('/profile/:userId?', sessionHandler.authenticatedUser, user.updateUserProfile);
    
    app.get('/confirm/:token', user.confirmRegistration);
    app.get('/passwordChange', user.confirmForgotPass);
    app.post('/passwordChange', user.changePassword);
    app.get('/profile/:id?', sessionHandler.authenticatedUser, user.getProfile);

    app.post('/avatar', sessionHandler.authenticatedUser, user.uploadAvatar);
    app.delete('/avatar/:id?', sessionHandler.authenticatedUser, user.removeAvatar);

    app.put('/personal', sessionHandler.authenticatedUser, user.updatePersonalInfo);
    app.put('/salon', sessionHandler.authenticatedUser, sessionHandler.isStylist, user.updateSalonInfo);
    app.put('/coordinates', sessionHandler.authenticatedUser, user.updateLocation);

    app.get('/service/:stylistId?', sessionHandler.authenticatedUser, sessionHandler.stylistOrAdmin, user.getStylistServices);

    app.get('/gallery/:id?', sessionHandler.authenticatedUser, user.getGalleryPhotos);
    app.delete('/gallery/:id', sessionHandler.authenticatedUser, sessionHandler.clientOrStylist, user.removePhotoFromGallery);

    app.get('/appointment', sessionHandler.authenticatedUser, user.getAppointments); //can accept query ?id=123 [&status=Pending //or Booked &page=2&limit=20] status for admin only
    app.post('/appointment/cancel', sessionHandler.authenticatedUser, sessionHandler.clientOrStylist, user.cancelByUser);


    app.get('/subscriptionTypes/:id?', sessionHandler.authenticatedUser, sessionHandler.clientOrAdmin, subscriptionHandler.getSubscriptionTypes);
    app.post('/subscriptionTypes', sessionHandler.authenticatedUser, sessionHandler.isAdmin, subscriptionHandler.createSubscriptionType);
    app.put('/subscriptionTypes/:id', sessionHandler.authenticatedUser, sessionHandler.isAdmin, subscriptionHandler.updateSubscriptionType);

    function notFound(req, res, next) {
        next();
    }

    function errorHandler(err, req, res, next) {
        var status = err.status || 500;

        if (process.env.NODE_ENV === 'production') {
            if (status === 404 || status === 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({message: err.message});
        } else {
            if (status !== 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({message: err.message, stack: err.stack});
        }

        if (status === 401) {
            console.warn(err.message);
        } else {
            console.error(err.message);
            console.error(err.stack);
        }
    }

    app.use(notFound);
    app.use(errorHandler);
};