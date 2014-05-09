"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Sensor          = mongoose.model('Sensor');
var Device          = mongoose.model('Device');
var _               = require('underscore');
var Promise         = require('bluebird');

module.exports = function () {
  var routes = {};

  routes.getSensors = function (req, res, next) {
    Sensor.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      next.ifError(err);
      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = '/sensor';
      return next();
    });
  };

  routes.getSensor = function (req, res, next) {
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
      .then(function(resource) {
        if (!resource) {
          throw new restify.ResourceNotFoundError();
        }
        res.send(resource);
        return next();
      })
      .then(null, function(err) {
        return next(err);
      });
  };

  routes.createSensor = function (req, res, next) {
    var sensor_data = _.pick(req.body, Sensor.createSafeFields);
    sensor_data.client = req.credentials.clientId;
    var sensor = new Sensor(sensor_data);
    Promise.promisify(sensor.save, sensor)()
      .then(function(new_resource) {
        res.send(201, new_resource[0]);
        return next();
      })
      .then(null, function(err) {
        return next(err);
      });
  };

  routes.updateSensor = function (req, res, next) {
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
      .then(function(resource){
        if (!resource) {
          throw new restify.ResourceNotFoundError();
        }
        var sensor_data = _.pick(req.body, Sensor.updateSafeFields);
        resource.set(sensor_data);
        return Promise.promisify(resource.save, resource)();
      })
      .then(function(resource) {
        res.send(200, resource[0]);
        return next();
      })
      .then(null, function(err) {
        return next(err);
      });
  };

  routes.deleteSensor = function (req, res, next) {
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
      .then(function(resource) {
        if (!resource) {
          throw new restify.ResourceNotFoundError();
        }
        return Promise.promisify(resource.remove,resource)();
      })
      .then(function(deleted_resources) {
        res.send(204);
        return next();
      })
      .then(null, function(err) {
        return next(err);
      });
  };

  return routes;
};