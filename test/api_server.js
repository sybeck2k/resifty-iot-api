var should     = require('should');
var request    = require('supertest');
var Logger     = require('bunyan');
var fs         = require('fs');
var mongoose   = require('mongoose');
var config     = require('../config.test');

var logger = new Logger({
    name: 'restify-iot-test',
    streams: [
      {
        stream: process.stdout,
        level: 'error'
      }
    ],
    serializers: {
      req: Logger.stdSerializers.req
    }
});

var models_path = require('path').normalize(__dirname) + '/../app/models';
var db = mongoose.connection;

// Connect to MongoDB
mongoose.connect(config.db_url);

db.on('error', logger.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  logger.debug("Database connection opened.");
});

// Bootstrap models
fs.readdirSync(models_path).forEach(function (file) {
  logger.debug("Loading model " + file);
  require(models_path + '/' +file);
});

describe('The server', function () {

  var server;

  beforeEach(function(){
    server = require('../app/server')(config, logger);
  });

  describe('when initialized', function() {
    it('GET / should be public', function(done) {
      request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done);
    });

    it('GET / should point to the proper token url and provide auth info', function(done) {
      request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect(function(res) {
          if (!('_links' in res.body) || !('oauth2-token' in res.body._links)) throw new Error("Missing oauth2-token information");
          if (!('href' in res.body._links['oauth2-token']) || res.body._links['oauth2-token'].href !== '/token') throw new Error("Missing oauth2-token URI");
        })
        .expect(200, done);
    });

  });

  afterEach(function(){
    server.close();
  });
});