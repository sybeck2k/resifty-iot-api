request = require("supertest")
config = require("../../config.test")
Logger = require("bunyan")
mongoose = require("mongoose")
crypto = require("crypto")
Client = mongoose.model("ClientKey")

logger = new Logger(
  name: "restify-iot-test"
  streams: [
    stream: process.stderr
    level: "error"
  ]
  serializers:
    req: Logger.stdSerializers.req
)

describe "The server", ->
  server = undefined
  beforeEach ->
    server = require("../../app/server")(config, logger)

  afterEach ->
    server.close()

  it "GET / should be public", (done) ->
    request(server).get("/").set("Accept", "application/json").expect("Content-Type", /json/).expect 200, done

  it "GET / should point to the proper token url and provide auth info", (done) ->
    request(server).get("/").set("Accept", "application/json").expect((res) ->
      throw new Error("Missing oauth2-token information")  if ("_links" not of res.body) or ("oauth2-token" not of res.body._links)
      throw new Error("Missing oauth2-token URI")  if ("href" not of res.body._links["oauth2-token"]) or res.body._links["oauth2-token"].href isnt "/token"
    ).expect 200, done

  it "GET /token should be not allowed without authentication", (done) ->
    request(server).get("/token").set("Accept", "application/json").expect 405, done

  it "POST /token should be not allowed without authentication", (done) ->
    request(server).get("/token").set("Accept", "application/json").expect 405, done

  describe "a client", ->
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
      Client.remove {}, ->
        done()


    describe "requesting a token", ->

      describe "with valid credentials", ->
        auth_request = undefined

        beforeEach ->
          auth_request = request.agent(server)

        it "POST /token should return a valid token", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth(client.client, client.secret).send(grant_type: "client_credentials").expect((res) ->
            throw new Error("Missing access_token")  unless "access_token" of res.body
            throw new Error("Incorrect Token Type returned")  if ("token_type" not of res.body) or res.body.token_type isnt "Bearer"
          ).expect 200, done

      describe "with invalid credentials", ->
        auth_request = undefined

        beforeEach ->
          auth_request = request.agent(server)

        it "POST /token should be forbidden with an invalid username", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth("foo", client.secret).send(grant_type: "client_credentials").expect 401, done

        it "POST /token should be forbidden with an invalid password", (done) ->
          auth_request.post("/token").set("Accept", "application/json").auth(client.client, "cucu").send(grant_type: "client_credentials").expect 401, done

