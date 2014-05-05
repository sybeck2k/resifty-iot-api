"use strict";

var mongoose        = require('mongoose');
var Sensor          = mongoose.model('Sensor');
var extend          = require('util')._extend;

module.exports = function () {
  var routes = {};

  routes.getSensors = function (req, res, next) {
    Sensor.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = '/sensor';
      return next();
    });
  };

  routes.getSensor = function (req, res, next) {
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}, function(err, resource){
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  };

  routes.createSensor = function (req, res, next) {
    Sensor.create(extend(req.body, {client: req.credentials.clientId}), function (err, new_resource) {
      if (err)
        return next(err);
      res.send(201, new_resource);
      return next();
    });
  };

  routes.updateSensor = function (req, res, next) {
    //@todo: cannot move the sensor to another device of which the user is not the owner!
    Sensor.findOneAndUpdate({_id: req.params.id, client: req.credentials.clientId}, {$set: req.body}, {upsert: true, safe:true}).exec(function(err, resource) {
      if (err)
        return next(err);
      res.send(resource);
      return next();
    });
  };

  routes.deleteSensor = function (req, res, next) {
    Sensor.find({_id: req.params.id, client: req.credentials.clientId}).remove(function(err){
      if (err)
        return next(err);
      res.send(204);
      return next();
    });
  };

  return routes;
};