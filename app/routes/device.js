"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Sensor          = mongoose.model('Sensor');
var Device          = mongoose.model('Device');
var _               = require('underscore');
var Promise         = require('bluebird');

module.exports = function () {
  var routes = {};

  routes.getDevices = function (req, res, next) {
    Device.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      next.ifError(err);
      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = '/device';
      return next();
    });
  };

  routes.getDevice = function (req, res, next) {
    Device.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
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

  routes.getSensors = function (req, res, next) {
    Sensor.paginate({device: req.params.id, client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      next.ifError(err);
      req.page_count = page_count;
      req.resource_base_url = '/device/' + req.params.id + '/sensors';
      req.resources = resources;
      return next();
    });
  };

  routes.createDevice = function (req, res, next) {
    var device_data = _.pick(req.body, Device.createSafeFields);
    device_data.client = req.credentials.clientId;
    var device = new Device(device_data);
    Promise.promisify(device.save, device)()
      .then(function(new_resource) {
        res.send(201, new_resource[0]);
        return next();
      })
      .then(null, function(err) {
        return next(err);
      });
  };

  routes.updateDevice = function (req, res, next) {
    Device.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
      .then(function(resource){
        if (!resource) {
          throw new restify.ResourceNotFoundError();
        }
        var device_data = _.pick(req.body, Device.updateSafeFields);
        resource.set(device_data);
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

  routes.deleteDevice = function (req, res, next) {
    Device.findOne({_id: req.params.id, client: req.credentials.clientId}).exec()
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