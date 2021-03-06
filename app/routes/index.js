"use strict";

var restify  = require('restify');

module.exports = function (server, config, sensor_reading_driver) {
  var validateClient   = require('../lib/middleware/validate-client'),
      validateObjectId = require('../lib/middleware/validate-objectId'),
      headerPagination = require('../lib/middleware/write-header-pagination');

  server.log.debug("Mounting public route /");
  server.get('/', function (req, res) {
    var response = {
      _links: {
        self: { href: '/' }
      }
    };

    response._links["oauth2-token"] = {
      "href": '/token',
      "grant-types": "client_credentials",
      "token-types": "bearer"
    };
    
    res.send(response);
  });

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
  var sensor_reading_routes = require('./sensor-reading')(sensor_reading_driver);
  //var sensor_state_routes = require('./sensor-state')(pubsub_server);

  server.get(  '/sensor'    , validateClient, sensor_route.getSensors, headerPagination);
  server.get(  '/sensor/:id', validateClient, validateObjectId, sensor_route.getSensor);
  server.post( '/sensor'    , validateClient, sensor_route.createSensor);
  server.patch('/sensor/:id', validateClient, validateObjectId, sensor_route.updateSensor);
  server.del(  '/sensor/:id', validateClient, validateObjectId, sensor_route.deleteSensor);

  server.post( '/sensor/:id/datapoint', validateClient, validateObjectId, sensor_reading_routes.createPoint);
  /*
  //delete a reading
  server.del(  '/sensor/:sensor_id/datapoint/:id' );
  //update a reading
  server.put(  '/sensor/:sensor_id/datapoint/:id' );
  
  //set the state
  server.put(  '/sensor/:id/state');
  //get the state
  server.get(  '/sensor/:id/state');
  */
};