var UserHandler = require('../handlers/users');

module.exports = function (app, db) {
    var logWriter = require('../modules/logWriter')();

    var userRouter = require('./users')(app, db);
    var userHandler = new UserHandler(app, db);

    app.get('/', function (req, res, next) {
        res.status(200).send('Express start succeed');
    });

    app.post('/signIn', userHandler.signIn);
    app.use('/users', userRouter);


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