"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');


module.exports = function (server, config, sensor_reading_driver, pubsub_server) {
  var resource_base_url = '/sensor-reading/:sensor_id',
      Resource = Sensor,
      validateClient = require('../lib/middleware/validate-client'),
      validateObjectId = require('../lib/middleware/validate-objectId'),
      headerPagination = require('../lib/middleware/write-header-pagination');

  // Validates that the given sensor exists and is associated to the authenticated client
  function validateSensor(req, res, next) {
    if (!req.params.sensor_id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new restify.InvalidArgumentError());
    }
    Resource.findOne({_id: req.params.sensor_id, client: req.credentials.clientId}, function(err, resource){
      if (err)
        return next(err);
      if (!resource) {
        res.send(404);
        return next();
      }
      req.sensor = resource.toJSON();
      
      return next();
    });
  }

  // Validates that the given reading is formally correct and consistant with the sensor type
  function validateReading(req, res, next) {
    if (req.sensor.type === 'scalar') {
      
    } else if (req.sensor.type === 'geo') {

    } else if (req.sensor.type === 'state') {

    } else {
      res.send(500);
    }
    return next();
  }

  server.post(resource_base_url, validateClient, validateSensor, validateReading, function (req, res, next) {
    //@todo add the time, if not explicitly set
    //mqtt-compliant
    var pubsub_message = {
      topic: '/sensor-reading/' + req.sensor.id,
      payload: req.body.value,
      qos: 0, // 0, 1, or 2
      retain: req.sensor.persistant
    };

    pubsub_server.publish(pubsub_message);

    if (req.sensor.persistant) {
      var point = { attr : req.body.value, time : new Date()};
      sensor_reading_driver.create(req.sensor, point, function (err, new_point){
        if (err)
          return next(err);
        res.send(201);
        return next();
      });
    } else {
      res.send(200);
    }
    
  });
};