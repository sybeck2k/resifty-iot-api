"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Sensor          = mongoose.model('Sensor');
var Device          = mongoose.model('Device');
var extend          = require('util')._extend;
var Promise         = require('bluebird');


module.exports = function () {
  var routes = {};

  routes.getSensors = function (req, res, next) {
    Sensor.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err) {
        req.log.error({error: err}, "Impossible to retrieve the Sensors from the DB");
        return next(new restify.InternalError());
      }
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
        if (err instanceof restify.HttpError){
          return next(err);
        }
        req.log.error({error: err}, "Impossible to retrieve the Sensor from the DB");
        return next(new restify.InternalError());
      });
  };

  routes.createSensor = function (req, res, next) {
    Sensor.create(extend(req.body, {client: req.credentials.clientId}))
      .then(function(new_resource) {
        res.send(201, new_resource);
        return next();
      })
      .then(null, function(err) {
        if (err.name && err.name === 'ValidationError') {
          return next(err);
        }
        req.log.error({error: err}, "Impossible to persist the sensor");
        return next(new restify.InternalError());
      });
  };

  routes.updateSensor = function (req, res, next) {
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
      .then(function(resource){
        if (!resource) {
          throw new restify.ResourceNotFoundError();
        }
        return resource;
      })
      .then(function(resource) {
        resource.name = req.body.name;
        return Promise.promisify(resource.save,resource)();
      })
      .then(function(resource) {
        res.send(200, resource[0]);
        return next();
      })
      .then(null, function(err) {
        if (err instanceof restify.HttpError){
          return next(err);
        }
        req.log.error({error: err}, "Impossible to retrieve the Sensor from the DB");
        return next(new restify.InternalError());
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
        if (err instanceof restify.HttpError){
          return next(err);
        }
        req.log.error({error: err}, "Impossible to delete the Sensor from the DB");
        return next(new restify.InternalError());
      });
  };

  return routes;
};