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

describe "The /device resource", ->
  server = undefined
  client =
      client: "client_name"
      secret: "client_secret"
      description: "test client"
  token =
     token: "aaaaaaaaaaaaaaaaaaaaaa"
     scope: ['*']
  a_device = 
    name:        "a name"
    description: "a description"
    meta:        {"some":"meta", "data":[0,1]}
    location:    []

  before (done) ->
    Client.create client, (err, new_client) ->
      if err
        logger.error err
        throw new Error("impossible to create the sample client")
      client = new_client.toJSON()
      Token.create  {clientId: client.id, token: token.token, scope: token.scope}, (err, new_token) ->
        if err
          logger.error err
          throw new Error("impossible to create the sample token")
        token = new_token.toJSON()
        Device.create {name: a_device.name, description: a_device.description, client: client.id}, (err, new_device) ->
          if err
            logger.error err
            throw new Error("impossible to create the sample device")
          a_device = new_device.toJSON()
          done()

  after (done) ->
    redis_client.flushdb (err, succes) ->
      throw err if err
      Device.remove (err, p) ->
        throw err if err
        Token.remove (err, p) ->
          throw err if err
          Client.remove (err, p) ->
            throw err if err
            done()

  beforeEach ->
    server = require("../../app/server")(config, logger, redis_client)

  afterEach ->
    server.close()

  describe "without a valid token", ->

    it "GET /device should be forbidden", (done) ->
      request(server).get("/device").expect("Content-Type", /json/).expect 403, done

    it "GET /device/:id should be forbidden", (done) ->
      request(server).get("/device/#{a_device.id}").set("Accept", "application/json").expect("Content-Type", /json/).expect 403, done

    it "POST /device should be forbidden", (done) ->
      another_device = _.clone(a_device)
      another_device.name = "another name"
      request(server).post("/device").set("Accept", "application/json").send(another_device)
        .expect("Content-Type", /json/)
        .expect(403)
        .end (err, res) ->
          return done(err) if err

          # test that another_device is not created
          Device.findOne {name: another_device.name}, (err, resource) ->
            should.not.exist(resource)
            done()    

    it "PATCH /device/:id should be forbidden", (done) ->
      request(server).patch("/device/#{a_device.id}").send({name: "modified"}).set("Accept", "application/json")
        .expect("Content-Type", /json/)
        .expect(403)
        .end (err, res) ->
          return done(err) if err
          # test that device is not modified
          Device.findOne {name: "modified"}, (err, resource) ->
            should.not.exist(resource)
            done()
      

    it "DEL /device/:id should be forbidden", (done) ->
      request(server).del("/device/#{a_device.id}").set("Accept", "application/json")
        .expect("Content-Type", /json/)
        .expect(403)
        .end (err, res) ->
          return done(err) if err
          # test that device is not deleted
          Device.findOne {_id: a_device.id}, (err, resource) ->
            resource.should.be.ok
            done()

  describe "with a valid token", ->

    it "GET /device should return an array of devices", (done) ->
      request(server).get("/device").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .expect("Content-Type", /json/)
        .expect(200)
        .end (err, res) ->
          return done(err) if err
          # test that the results are the same count of the original one
          Device.find {}, (err, devices) ->
            res.body.length.should.equal(devices.length)
            done()

    it "GET /device/:id should return one Device", (done) ->
      request(server).get("/device/#{a_device.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .expect("Content-Type", /json/)
        .expect(200)
        .end (err, res) ->
          return done(err) if err
          # test that the device returned is the expected one
          res.body.id.should.equal(a_device.id.toHexString())
          done()

    it "POST /device should create a new Device", (done) ->
      another_device = _.clone(a_device)
      delete another_device.id
      request(server).post("/device").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .send(another_device)
        .expect("Content-Type", /json/)
        .expect(201)
        .end (err, res) ->
          return done(err) if err
          # test that the the new device id is returned
          res.body.id.should.be.ok
          another_device._id = res.body.id
          Device.find another_device, (err, devices) ->
            devices.length.should.equal(1)
            # dispose of the new device
            devices[0].remove (err) ->
              return done(err) if err
              done()

    it "PATCH /device/:id should modify an existing Device", (done) ->
      another_device = _.clone(a_device)
      delete another_device.id
      Device.create another_device, (err, new_device) ->
        if err
          logger.error(another_device, err)
          throw new Error("impossible to create the sample device")
        another_device = new_device.toJSON()
        
        request(server).patch("/device/#{another_device.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .send({name: "Modified Name"})
          .expect("Content-Type", /json/)
          .expect(200)
          .end (err, res) ->
            return done(err) if err
            # test that the the new device id is returned
            res.body.id.should.be.ok
            res.body.name.should.equal("Modified Name")
            another_device._id = res.body.id
            Device.findOne {_id: res.body.id}, (err, device) ->
              device.name.should.equal("Modified Name")
              # dispose of the new device
              device.remove (err) ->
                return done(err) if err
                done()

    it "DEL /device/:id should delete an existing Device", (done) ->
      another_device = _.clone(a_device)
      delete another_device.id
      Device.create another_device, (err, new_device) ->
        if err
          logger.error(another_device, err)
          throw new Error("impossible to create the sample device")
        another_device = new_device.toJSON()
        
        request(server).del("/device/#{another_device.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .expect(204)
          .end (err, res) ->
            return done(err) if err
            # test that no body content is returned
            res.body.should.be.empty
            # test that the device is also removed from the DB
            Device.findOne {_id: another_device.id}, (err, device) ->
              (device == null).should.be.true
              done()
