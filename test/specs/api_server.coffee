request  = require("supertest")
config   = require("../../config.test")
Logger   = require("bunyan")
mongoose = require("mongoose")
crypto   = require("crypto")
redis    = require("redis")
Client   = mongoose.model("ClientKey")
Token    = mongoose.model("ClientToken")

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


describe "The server", ->
  server = undefined
  beforeEach ->
    server = require("../../app/server")(config, logger, redis_client)

  afterEach ->
    server.close()

  it "GET / should be public", (done) ->
    request(server).get("/").set("Accept", "application/json").expect("Content-Type", /json/).expect 200, done

  it "GET / should point to the proper token url and provide auth info", (done) ->
    request(server).get("/").set("Accept", "application/json").expect(200).end((err, res) ->
      return done(err) if err
      res.body._links.should.exist
      res.body._links.should.have.property("oauth2-token")
      res.body._links["oauth2-token"].should.have.keys("href", "grant-types", "token-types")
      res.body._links["oauth2-token"]["href"].should.equal("/token")
      res.body._links["oauth2-token"]["grant-types"].should.equal("client_credentials")
      res.body._links["oauth2-token"]["token-types"].should.equal("bearer")
      done()
    )
  

  it "GET /token should be not allowed without authentication", (done) ->
    request(server).get("/token").set("Accept", "application/json").expect 405, done

  it "POST /token should be not allowed without authentication", (done) ->
    request(server).get("/token").set("Accept", "application/json").expect 405, done

  describe "with a client", ->
    client =
      client: "client_name"
      secret: "client_secret"
      description: "test client"
      id: null

    before (done) ->
      #create a dummy client
      Client.create client, (err, new_client) ->
        if err
          logger.error err
          throw new Error("impossible to create the sample client")
        client.id = new_client._id
        done()

    after (done) ->
      redis_client.flushdb (err, succes) ->
        throw err if err
        Token.remove (err, p) ->
          throw err if err
          Client.remove (err, p) ->
            throw err if err
            done()

    describe "requesting a token", ->

      describe "with valid credentials", ->
        auth_request = undefined

        beforeEach ->
          auth_request = request.agent(server)

        it "POST /token should return a valid token", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth(client.client, client.secret).send(grant_type: "client_credentials").expect(200).end((err, res) ->
            return done(err) if err
            res.body.should.have.property("access_token")
            res.body.token_type.should.be.equal("Bearer")
            done()
          )

      describe "without valid credentials", ->
        auth_request = undefined

        beforeEach ->
          auth_request = request.agent(server)

        it "POST /token should be forbidden with an invalid username", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth("foo", client.secret).send(grant_type: "client_credentials").expect 401, done

        it "POST /token should be forbidden with an invalid password", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth(client.client, "cucu").send(grant_type: "client_credentials").expect 401, done

