request  = require("supertest")
config   = require("../../config.test")
Logger   = require("bunyan")
mongoose = require("mongoose")
crypto   = require("crypto")
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

'''
sinon.stub(redis_client, "hgetall").yields {message: "error"}, null
sinon.stub(mongoose.Model, "findOne").yields {message: "error"}, null
'''

describe "The OAuth hooks", ->
  oauth_hooks = undefined
  beforeEach ->
    oauth_hooks = require("../../app/lib/oauth-hooks")(config, logger, redis_client)

  afterEach ->
    #server.close()

  describe "when Redis is not working correctly", ->
    auth_stub = undefined
    credentials = 
      clientId: 123
      clientSecret: "abc"

    before ->
      client = new Client()
      auth_stub = sinon.stub(client,"authenticate").returns true

      sinon.stub(redis_client, "hgetall").yields {message: "error"}, null
      sinon.stub(redis_client, "hmset").yields {message: "error"}

      sinon.stub(Client, "findOne").yields null, client

    after ->
      redis_client.hgetall.restore()
      redis_client.hmset.restore()
      Client.findOne.restore()
      auth_stub.restore()

    it "should be able to create a token and retrieve it without errors", (done) ->
      oauth_hooks.grantClientToken credentials, {}, (err, token) ->
        sinon.stub(Token, "findOne").yields null, new Token({token: token})
        oauth_hooks.authenticateToken token, {}, (err, authenticated) ->
          Token.findOne.restore()
          authenticated.should.be.true
          done()