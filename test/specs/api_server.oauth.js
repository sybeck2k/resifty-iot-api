var request    = require('supertest');
var config     = require('../../config.test');
var Logger     = require('bunyan');
var mongoose   = require('mongoose');
var crypto     = require("crypto");
var Client     = mongoose.model('ClientKey');

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

  var server,
      client = {client: 'client_name', secret: 'client_secret', description: 'test client', id: null},
      auth_request;

  before(function(done){
    //create a dummy client
    Client.create(client, function (err, new_client) {
      if (err){
        logger.error(err);
        throw new Error('impossible to create the sample client');
      }
      client.id = new_client._id;
      done();
    });
  });

  beforeEach(function(){
    server = require('../../app/server')(config, logger);
    auth_request = request.agent(server);
  });

  describe('Oauth', function() {
    it('GET /token should be forbidden without authentication', function(done) {
      request(server)
        .get('/token')
        .set('Accept', 'application/json')
        .expect(405, done);
    });

    it('POST /token should point to the proper token url and provide auth info', function(done) {
      auth_request
        .post('/token')
        .set('Accept', 'application/json')
        .auth(client.client, client.secret)
        .send({ grant_type: 'client_credentials'})
        .expect(function(res) {
          if (!('access_token' in res.body)) throw new Error("Missing access_token");
          if (!('token_type' in res.body) || res.body.token_type !== 'Bearer') throw new Error("Incorrect Token Type returned");
        })
        .expect(200, done);
    });
  });

  afterEach(function(){
    server.close();
  });

  after(function(done){
    if (client.id) {
      Client.remove({ id: client.id }, function (err) {
        if (err)
          logger.warn("Possible spurious client in MongoDB");
        done();
      });
    } else {
      done();
    }
  });
});