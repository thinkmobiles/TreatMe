
module.exports = function (app, db) {
    var ServiceType = db.model('ServiceType');

    var logWriter = require('../modules/logWriter')();

   /* var businessRouter = require('./business')(app, db);
    var clientsRouter = require('./clients')(app, db);*/
    var adminRouter = require('./admin')(db);

    var SubscriptionHandler = require('../handlers/subscription');
    var UserHandler = require('../handlers/users');
    var SessionHandler = require('../handlers/sessions');

    var subscriptionHandler = new SubscriptionHandler(db);
    var user = new UserHandler(app, db);
    var sessionHandler = new SessionHandler();

    app.get('/', function (req, res, next) {
        res.status(200).send('Express start succeed');
    });

    /*app.use('/business', businessRouter);
    app.use('/client', clientsRouter);*/
    app.use('/admin', adminRouter);

    app.post('/signUp', user.signUp);
    app.get('/confirm/:token', user.confirmRegistration);


    app.put('/personal', sessionHandler.authenticatedUser, user.updatePersonalInfo);
    app.put('/salon', sessionHandler.authenticatedUser, sessionHandler.isStylist, user.updateSalonInfo);


    app.get('/subscriptionTypes', subscriptionHandler.getSubscriptionTypes);
    app.get('/subscriptionTypes/:id', subscriptionHandler.getSubscriptionTypeById);
    app.post('/subscriptionTypes', subscriptionHandler.createSubscriptionType);
    app.put('/subscriptionTypes/:id', subscriptionHandler.updateSubscriptionType);

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