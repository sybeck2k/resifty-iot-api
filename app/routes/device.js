"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');
var extend          = require('util')._extend;

module.exports = function () {
  var routes = {};

  routes.getDevices = function (req, res, next) {
    Device.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = '/device';
      return next();
    });
  };

  routes.getDevice = function (req, res, next) {
    Device.findOne({_id: req.params.id, client: req.credentials.clientId}, function(err, resource){
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  };

  routes.getSensors = function (req, res, next) {
    Sensor.paginate({device: req.params.id, client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resource_base_url = '/device' + req.params.id + '/sensors';
      req.resources = resources;
      return next();
    });
  };

  routes.createDevice = function (req, res, next) {
    Device.create(extend(req.body, {client: req.credentials.clientId}), function (err, new_resource) {
      if (err)
        return next(err);
      res.send(201, new_resource);
      return next();
    });
  };

  routes.updateDevice = function (req, res, next) {
    if ('client' in req.body) {
      delete req.body.client;
    }
    Device.findOneAndUpdate({_id: req.params.id, client: req.credentials.clientId},
      {$set: req.body}, {upsert: true, safe:true}).exec(function(err, resource) {
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  };

  routes.deleteDevice = function (req, res, next) {
    Device.find({_id: req.params.id, client: req.credentials.clientId}).remove(function(err){
      if (err)
        return next(err);
      res.send(204);
      return next();
    });
  };

  return routes;
};