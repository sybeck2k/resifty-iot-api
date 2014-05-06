request  = require("supertest")
config   = require("../../config.test")
Logger   = require("bunyan")
mongoose = require("mongoose")
restify  = require("restify")
redis    = require("redis")
_        = require("underscore")
should   = require('should');
Client   = mongoose.model("ClientKey")
Token    = mongoose.model("ClientToken")
Device   = mongoose.model("Device")
sinon    = require("sinon")

logger = new Logger(
  name: "restify-iot-test"
  streams: [
    stream: process.stderr
    level: "error"
  ]
  serializers:
    req: Logger.stdSerializers.req
)

redis_uri = require("url").parse(config.redis_url)
redis_client = redis.createClient redis_uri.port, redis_uri.hostname
if (redis_uri.auth)
  redis_client.auth redis_uri.auth.split(":")[1]


describe "The OAuth hooks", ->
  oauth_hooks = undefined
  beforeEach ->
    oauth_hooks = require("../../app/lib/oauth-hooks")(config, logger, redis_client)

  afterEach ->
    #server.close()

  describe "when Redis is not working correctly", ->
    client = new Client()
    credentials = 
      clientId: 123
      clientSecret: "abc"

    before ->
      sinon.stub(redis_client, "hgetall").yields {message: "error"}, null
      sinon.stub(redis_client, "hmset").yields {message: "error"}
      sinon.stub(Client, "findOne").yields null, client

    after ->
      redis_client.hgetall.restore()
      redis_client.hmset.restore()
      Client.findOne.restore()

    it "should be able to create a token and retrieve it from the MongoDB without errors", (done) ->
      oauth_hooks.grantClientToken credentials, {}, (err, token) ->
        sinon.stub(Token, "findOne").yields null, new Token({token: token})
        oauth_hooks.authenticateToken token, {}, (err, authenticated) ->
          Token.findOne.restore()
          authenticated.should.be.true
          done()

    it "should not authenticate an invalid token", (done) ->
      oauth_hooks.grantClientToken credentials, {}, (err, token) ->
        sinon.stub(Token, "findOne").yields null, null
        oauth_hooks.authenticateToken "invalid_token", {}, (err, authenticated) ->
          Token.findOne.restore()
          authenticated.should.be.false
          done()


  describe "when MongoDB is not working correctly", ->
    client = new Client()
    logger_mock = undefined
    credentials = 
      clientId: 123
      clientSecret: "abc"

    before ->
      sinon.stub(redis_client, "hgetall").yields null, null
      sinon.stub(redis_client, "hmset").yields null
      sinon.stub(Client, "findOne").yields {error: "error"}, null
      sinon.stub(Token, "create").yields {error: "error"}, null

    after ->
      redis_client.hgetall.restore()
      redis_client.hmset.restore()
      Client.findOne.restore()
      Token.create.restore()

    beforeEach ->
      logger_mock = sinon.mock(oauth_hooks.log)
    
    afterEach ->
      logger_mock.restore()

    describe "when generating the Token", ->
      it "a request to grant a token should return an internal error", (done) ->
        logger_error_mock = logger_mock.expects("error").once()
        oauth_hooks.grantClientToken credentials, {}, (err, token) ->
          logger_error_mock.verify()
          (!!token).should.be.false
          err.should.be.an.instanceof(restify.InternalError)
          done()

    describe "when validating the scopes", ->
      it "a request to grant a token should return an internal error", (done) ->
        logger_error_mock = logger_mock.expects("error").once()
        oauth_hooks.grantScopes credentials, [], {clientObjId: "abc"}, (err, scopes) ->
          logger_error_mock.verify()
          (!!scopes).should.be.false
          err.should.be.an.instanceof(restify.InternalError)
          done()
