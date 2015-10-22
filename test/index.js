'use strict';

var app;
var db;

process.env.NODE_ENV = 'test';

app = require('../app')();
db = app.get('db');

var DbHandler = require('./testHandlers/dbHandler');
var dbHandler = new DbHandler(db);

describe('Database initialization', function () {
    this.timeout(5000);

    it('Drop the collections', function (done) {

        dbHandler.dropCollections(done);

    });

    it('Test handlers', function () {
        require('./testHandlers/testUsers')(db);
        require('./testHandlers/testImages')(db);
    });
});
