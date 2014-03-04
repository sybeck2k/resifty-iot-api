var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');


module.exports = function (server, config, influx_client) {
  var resource_base_url = '/sensor-reading/:sensor_id',
      Resource = Sensor,
      route_utils = require('../lib/route-utils');

  function validateSensor(req, res, next) {
    if (!req.params.sensor_id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new restify.InvalidArgumentError());
    }
    Resource.findOne({_id: req.params.sensor_id}, function(err, resource){
      if (err)
        return next(err);
      req.sensor = resource;
      req.series_name = "sensor_" + resource._id;
      return next();
    });
  }

  server.post(resource_base_url, route_utils.validateClient, validateSensor, function (req, res, next) {
    if (req.sensor.persistant) {
      var point = { attr : req.body.value, time : new Date()};
      influx_client.writePoint(req.series_name, point, {time_precision: 'm'}, function (err, new_point){
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