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
Sensor   = mongoose.model("Sensor")

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

describe "The /sensor resource", ->
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

  create_a_sensor = (cb)->
    a_sensor = 
      name:        "a name"
      description: "a description"
      type:        "scalar"
      meta:        {"some":"meta", "data":[0,1]}
      location:    []
      device:      a_device.id
      client:     client.id
    Sensor.create a_sensor, (err, new_sensor) ->
      if err
        cb err, null
      cb null, new_sensor.toJSON()

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
      Sensor.remove (err, p) ->
          throw err if err
        Device.remove (err, p) ->
          throw err if err
          Token.remove (err, p) ->
            throw err if err
            Client.remove (err, p) ->
              throw err if err
              done()

  beforeEach (done) ->
    server = require("../../app/server")(config, logger, redis_client)
    done()

  afterEach (done) ->
    server.close()
    Sensor.remove (err, p) ->
      throw err if err
      done()

  describe "without a valid token", ->
    it "GET /sensor should be forbidden", (done) ->
      request(server).get("/sensor").expect("Content-Type", /json/).expect 403, done

    it "GET /sensor/:id should be forbidden", (done) ->
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).get("/sensor/#{a_sensor.id}").set("Accept", "application/json").expect("Content-Type", /json/).expect 403, done

    it "POST /sensor should be forbidden", (done) ->
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        another_sensor = _.clone(a_sensor)
        another_sensor.name = "another name"
        request(server).post("/sensor").set("Accept", "application/json").send(another_sensor)
          .expect("Content-Type", /json/)
          .expect(403)
          .end (err, res) ->
            return done(err) if err
            # test that another_sensor is not created
            Sensor.findOne {name: another_sensor.name}, (err, resource) ->
              should.not.exist(resource)
              done()    

    it "PATCH /sensor/:id should be forbidden", (done) ->
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).patch("/sensor/#{a_sensor.id}").send({name: "modified"}).set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(403)
          .end (err, res) ->
            return done(err) if err
            # test that sensor is not modified
            Sensor.findOne {name: "modified"}, (err, resource) ->
              should.not.exist(resource)
              done()  

    it "DEL /sensor/:id should be forbidden", (done) ->
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).del("/sensor/#{a_sensor.id}").set("Accept", "application/json")
          .expect("Content-Type", /json/)
          .expect(403)
          .end (err, res) ->
            return done(err) if err
            # test that sensor is not deleted
            Sensor.findOne {_id: a_sensor.id}, (err, resource) ->
              resource.should.be.ok
              done()

  describe "with a valid token", ->
    a_sensor = 
      name:        "a name"
      description: "a description"
      type:        "scalar"
      meta:        {"some":"meta", "data":[0,1]}
      location:    []

    it "GET /sensor should return an array of sensors", (done) ->
      create_a_sensor (err, another_sensor) ->
        return done(err) if err
        request(server).get("/sensor").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .expect("Content-Type", /json/)
          .expect(200)
          .end (err, res) ->
            return done(err) if err
            # test that the results are the same count of the original one
            Sensor.find {}, (err, sensors) ->
              res.body.length.should.equal(sensors.length)
              done()

    it "GET /sensor/:id should return one Sensor", (done) ->
      create_a_sensor (err, another_sensor) ->
        return done(err) if err
        request(server).get("/sensor/#{another_sensor.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .expect("Content-Type", /json/)
          .expect(200)
          .end (err, res) ->
            return done(err) if err
            # test that the sensor returned is the expected one
            res.body.id.should.equal(another_sensor.id.toHexString())
            done()

    it "POST /sensor should create a new Sensor", (done) ->
      a_sensor.device = a_device.id
      a_sensor.client = client.id
      request(server).post("/sensor").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .send(a_sensor)
        .expect("Content-Type", /json/)
        .expect(201)
        .end (err, res) ->
          return done(err) if err
          # test that the the new sensor id is returned
          res.body.id.should.be.ok
          Sensor.find {client: a_sensor.client}, (err, sensors) ->
            sensors.length.should.equal(1)
            done()

    it "PATCH /sensor should modify an existing Sensor", (done) -> 
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).patch("/sensor/#{a_sensor.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .send({name: "Modified Name"})
          .expect("Content-Type", /json/)
          .end (err, res) ->
            return done(err) if err
            # test that the the modified sensor id is returned
            res.body.id.should.be.ok
            res.body.name.should.equal("Modified Name")
            done()

    it "DEL /sensor/:id should delete an existing Sensor", (done) ->
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).del("/sensor/#{a_sensor.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .expect(204)
          .end (err, res) ->
            return done(err) if err
            # test that no body content is returned
            res.body.should.be.empty
            # test that the sensor is also removed from the DB
            Sensor.findOne {_id: a_sensor.id}, (err, sensor) ->
              (sensor == null).should.be.true
              done()
