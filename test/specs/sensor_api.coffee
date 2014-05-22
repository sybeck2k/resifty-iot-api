request  = require("supertest")
config   = require("../../config.test")
Logger   = require("bunyan")
mongoose = require("mongoose")
crypto   = require("crypto")
redis    = require("redis")
_        = require("underscore")
should   = require('should')
moment   = require('moment')
Client   = mongoose.model("ClientKey")
Token    = mongoose.model("ClientToken")
Device   = mongoose.model("Device")
Sensor   = mongoose.model("Sensor")

log = new Logger
  name: "restify-iot-test"
  streams: [
    stream: process.stderr
    level: "error"
  ]
  serializers:
    req: Logger.stdSerializers.req


redis_uri = require("url").parse(config.redis_url)
redis_client = redis.createClient redis_uri.port, redis_uri.hostname
if (redis_uri.auth)
  redis_client.auth redis_uri.auth.split(":")[1]

sensor_reading_driver = require("../../app/lib/sensor-storage/memory")(config, log)

sensor_reading_driver.init (err, driver)->
  throw err if (err)

oauth_methods = require("../../app/lib/oauth-hooks")(config, log, redis_client)
server = require("../../app/api_server")(config, log, redis_client, oauth_methods, sensor_reading_driver)

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

  '''
  Create a default sensor, or the one given as input
  '''
  create_a_sensor = (a_sensor, cb)->
    if (_.isFunction(a_sensor))
      cb = a_sensor
      a_sensor = 
        name:        "a name"
        description: "a description"
        type:        "scalar"
        meta:        {"some":"meta", "data":[0,1]}
        location:    []

    a_sensor.device = a_device.id
    a_sensor.client  = client.id

    Sensor.create a_sensor, (err, new_sensor) ->
      if err
        cb err, null
      cb null, new_sensor.toJSON()

  before (done) ->
    Client.create client, (err, new_client) ->
      if err
        log.error err
        throw new Error("impossible to create the sample client")
      client = new_client.toJSON()
      Token.create  {clientId: client.id, token: token.token, scope: token.scope}, (err, new_token) ->
        if err
          log.error err
          throw new Error("impossible to create the sample token")
        token = new_token.toJSON()
        Device.create {name: a_device.name, description: a_device.description, client: client.id}, (err, new_device) ->
          if err
            log.error err
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
    server = require("../../app/api_server")(config, log, redis_client, oauth_methods, sensor_reading_driver)
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
    a_sensor = undefined

    beforeEach ->
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

    it "GET /sensor/:id should return not found if not existing", (done) ->
      create_a_sensor (err, another_sensor) ->
        return done(err) if err
        request(server).get("/sensor/"+mongoose.Types.ObjectId()).set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .expect("Content-Type", /json/)
          .expect 404 , done

    it "POST /sensor with valid data should create a new Sensor", (done) ->
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

    it "POST /sensor without a name should return an informative error", (done) ->
      a_sensor.device = a_device.id
      a_sensor.client = client.id
      a_sensor.name = ""
      request(server).post("/sensor").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .send(a_sensor)
        .expect("Content-Type", /json/)
        .expect(422)
        .end (err, res) ->
          return done(err) if err
          # test that the the new sensor id is returned
          res.body.errors.name.should.be.ok
          done()

    it "POST /sensor with an inexisting device ID should return an informative error", (done) ->
      a_sensor.device = mongoose.Types.ObjectId()
      a_sensor.client = client.id
      request(server).post("/sensor").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
        .send(a_sensor)
        .expect("Content-Type", /json/)
        .expect(422)
        .end (err, res) ->
          return done(err) if err
          # test that the the new sensor id is returned
          res.body.errors.device.should.be.ok
          done()

    it "PATCH /sensor/:id should modify an existing Sensor", (done) -> 
      create_a_sensor (err, a_sensor) ->
        return done(err) if err
        request(server).patch("/sensor/#{a_sensor.id}").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .send({name: "Modified Name"})
          .expect("Content-Type", /json/)
          .expect(200)
          .end (err, res) ->
            return done(err) if err
            # test that the the modified sensor id is returned
            res.body.id.should.be.ok
            res.body.name.should.equal("Modified Name")
            done()

    it "PATCH /sensor/:id should return not found if not existing", (done) -> 
      create_a_sensor (err, another_sensor) ->
        return done(err) if err
        request(server).patch("/sensor/"+mongoose.Types.ObjectId()).set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .send({name: "Modified Name"})
          .expect("Content-Type", /json/)
          .expect 404 , done

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

    it "DEL /sensor/:id should return not found if not existing", (done) -> 
      create_a_sensor (err, another_sensor) ->
        return done(err) if err
        request(server).del("/sensor/"+mongoose.Types.ObjectId()).set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
          .send({name: "Modified Name"})
          .expect("Content-Type", /json/)
          .expect 404 , done

    describe "the sensor reading", ->
      
      it "POST /sensor/:id/datapoint should return not found if not existing", (done) -> 
        create_a_sensor (err, a_sensor) ->
          return done(err) if err
          request(server).post("/sensor/"+mongoose.Types.ObjectId()+"/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({an: "object"})
            .expect("Content-Type", /json/)
            .expect 404 , done
      
      it "POST /sensor/:id/datapoint should return a validation error if neither current_value nor datapoints are given", (done) -> 
        create_a_sensor (err, a_sensor) ->
          return done(err) if err
          request(server).post("/sensor/#{a_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({an: "object"})
            .expect("Content-Type", /json/)
            .expect 409 , done
      
      it "POST /sensor/:id/datapoint should return a validation error if datapoints is not an array", (done) -> 
        create_a_sensor (err, a_sensor) ->
          return done(err) if err
          request(server).post("/sensor/#{a_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: "string"})
            .expect("Content-Type", /json/)
            .expect 409 , done
      
      it "POST /sensor/:id/datapoint should return a method not allowed error if the sensor is output only", (done) ->
        a_sensor.direction = 'output'
        create_a_sensor a_sensor, (err, a_sensor) ->
          return done(err) if err
          request(server).post("/sensor/#{a_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: "string"})
            .expect("Content-Type", /json/)
            .expect 405 , done

      it "POST /sensor/:id/datapoint should return a 201 status code if it's persistant and correctly created", (done) ->
        a_sensor = 
            name:           "a name"
            persistant:     true
            device:         a_device.id
            client:         client.id

        create_a_sensor a_sensor, (err, another_sensor) ->
          return done(err) if err
          request(server).post("/sensor/#{another_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({current_value: 1})
            .expect("Content-Type", /json/)
            .expect 201, done()

      it "POST /sensor/:id/datapoint should return a 200 status code if it's not persistant and correctly created", (done) ->
        a_sensor = 
          name:           "a name"
          persistant:     false
          device:         a_device.id
          client:         client.id

        create_a_sensor a_sensor, (err, another_sensor) ->
          return done(err) if err
          request(server).post("/sensor/#{another_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({current_value: 1})
            .expect("Content-Type", /json/)
            .expect 200, done()

      describe "of type `geo`", ->
        a_geo_sensor = undefined

        beforeEach (done) ->
          a_geo_sensor = 
            name:           "a name"
            description:    "a description"
            type:           "geo"
            meta:           {"some":"meta", "data":[0,1]}
            time_precision: 's'
            location:       []
            device:         a_device.id
            client:         client.id

          create_a_sensor a_geo_sensor, (err, another_sensor) ->
            return done(err) if err
            a_geo_sensor = another_sensor
            done()

        it "POST /sensor/:id/datapoint with an array of 2 floats as current value should return a new reading", (done) ->
          request(server).post("/sensor/#{a_geo_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({current_value: [1.33, 100.33]})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              now = moment().unix()
              res.body.should.be.ok
              res.body.value.should.eql [1.33, 100.33]
              (res.body.at / 1000000).should.be.above(now-1).and.be.below(now+1)
              done()

        it "POST /sensor/:id/datapoint with an invalid array of floats as current value should return a new reading", (done) ->
          request(server).post("/sensor/#{a_geo_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({current_value: [1.33]})
            .expect("Content-Type", /json/)
            .expect 422, done()

        it "POST /sensor/:id/datapoint with a valid list of datapoints of array of floats should return a list of the same size of new readings", (done) ->
          datapoints = []
          for x in [1..15]
            test_array=[_.random(10,100),_.random(10,100)] 
            datapoints.push 
              at: moment().unix() - x
              value: test_array

          request(server).post("/sensor/#{a_geo_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: datapoints})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              res.body.should.be.ok
              res.body.length.should.equal(15)
              done()

        it "POST /sensor/:id/datapoint with an invalid list of datapoints of array of floats should return a list of the same size of new readings", (done) ->
          datapoints = []
          for x in [1..15]
            test_array=[_.random(10,100),_.random(10,100)] 
            datapoints.push 
              at: moment().unix() - x
              value: test_array

          datapoints[2].value= [1]
          request(server).post("/sensor/#{a_geo_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: datapoints})
            .expect("Content-Type", /json/)
            .expect 422, done()

        it "POST /sensor/:id/datapoint with a list of datapoints of array of floats AND a current reading should return a list of the same size of new readings", (done) ->
          datapoints = []
          for x in [1..15]
            test_array=[_.random(10,100),_.random(10,100)] 
            datapoints.push 
              at: moment().unix() - x
              value: test_array

          request(server).post("/sensor/#{a_geo_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: datapoints, current_value: [1.33, 100.33]})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              res.body.should.be.ok
              res.body.length.should.equal(16)
              done()

      describe "of type `scalar`", ->
        a_scalar_sensor = undefined

        beforeEach (done) ->
          a_scalar_sensor = 
            name:           "a name"
            description:    "a description"
            type:           "scalar"
            meta:           {"some":"meta", "data":[0,1]}
            time_precision: 's'
            location:       []
            device:         a_device.id
            client:         client.id

          create_a_sensor a_scalar_sensor, (err, another_sensor) ->
            return done(err) if err
            a_scalar_sensor = another_sensor
            done()

        it "POST /sensor/:id/datapoint with a float as current value should return a new reading", (done) ->
          request(server).post("/sensor/#{a_scalar_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({current_value: 255.55})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              now = moment().unix()
              res.body.should.be.ok
              res.body.value.should.equal 255.55
              (res.body.at / 1000000).should.be.above(now-1).and.be.below(now+1)
              done()

        it "POST /sensor/:id/datapoint with a list of datapoints of floats should return a list of the same size of new readings", (done) ->
          datapoints = []
          for x in [1..15]
            datapoints.push 
              at: moment().unix() - x
              value: _.random(10,100)

          request(server).post("/sensor/#{a_scalar_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: datapoints})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              res.body.should.be.ok
              res.body.length.should.equal(15)
              done()

        it "POST /sensor/:id/datapoint with a list of datapoints of floats AND a current reading should return a list of the same size of new readings", (done) ->
          datapoints = []
          for x in [1..15]
            datapoints.push 
              at: moment().unix() - x
              value: _.random(10,100)

          request(server).post("/sensor/#{a_scalar_sensor.id}/datapoint").set("Accept", "application/json").set('Authorization', "Bearer #{token.token}")
            .send({datapoints: datapoints, current_value: 1.33})
            .expect("Content-Type", /json/)
            .expect 201
            .end (err, res) ->
              return done(err) if err
              res.body.should.be.ok
              res.body.length.should.equal(16)
              done()

      describe "of type `state`", ->
        
