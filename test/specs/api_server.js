var request    = require('supertest');
var config     = require('../../config.test');
var Logger     = require('bunyan');

var logger = new Logger({
    name: 'restify-iot-test',
    streams: [
      {
        stream: process.stderr,
        level: 'error'
      }
    ],
    serializers: {
      req: Logger.stdSerializers.req
    }
});

describe('The server', function () {

  var server;

  beforeEach(function(){
    server = require('../../app/server')(config, logger);
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