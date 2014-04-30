"use strict";

var restify  = require('restify'),
    mongoose = require('mongoose'),
    Sensor   = mongoose.model('Sensor');

// Validates that the given sensor exists and is associated to the authenticated client
function validateSensor(req, res, next) {
  Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}, function(err, resource){
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
  //we have to normalize the input 
  if (req.sensor.type === 'scalar') {
    
  } else if (req.sensor.type === 'geo') {

  } else if (req.sensor.type === 'state') {

  } else {
    res.send(500);
  }
  return next();
}

module.exports = function (server, config, sensor_reading_driver, pubsub_server) {
  var validateClient = require('../lib/middleware/validate-client'),
      validateObjectId = require('../lib/middleware/validate-objectId'),
      headerPagination = require('../lib/middleware/write-header-pagination');

  server.log.debug("Mounting device routes to /device");
  var device_routes = require('./device')();
  server.get(  '/device'            , validateClient, device_routes.getDevices, headerPagination);
  server.get(  '/device/:id'        , validateClient, validateObjectId, device_routes.getDevice);
  server.post( '/device'            , validateClient, device_routes.createDevice);
  server.patch('/device/:id'        , validateClient, validateObjectId, device_routes.updateDevice);
  server.del(  '/device/:id'        , validateClient, validateObjectId, device_routes.deleteDevice);
  server.get(  '/device/:id/sensors', validateClient, device_routes.getSensors, headerPagination);

  server.log.debug("Mounting sensor routes to /sensor");
  var sensor_route = require('./sensor')();
  var sensor_reading_routes = require('./sensor-reading')(sensor_reading_driver, pubsub_server);
  server.get(  '/sensor'    , validateClient, sensor_route.getSensors, headerPagination);
  server.get(  '/sensor/:id', validateClient, validateObjectId, sensor_route.getSensor);
  server.post( '/sensor'    , validateClient, sensor_route.createSensor);
  server.patch('/sensor/:id', validateClient, validateObjectId, sensor_route.updateSensor);
  server.del(  '/sensor/:id', validateClient, validateObjectId, sensor_route.deleteSensor);
  server.put(  '/sensor/:id', validateClient, validateObjectId, validateSensor, validateReading, sensor_reading_routes.createPoint);
};