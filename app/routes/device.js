"use strict";

var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');
var extend          = require('util')._extend;

module.exports = function (server, config) {
  var resource_base_url = '/device',
      Resource = Device,
      validateClient = require('../lib/middleware/validate-client'),
      validateObjectId = require('../lib/middleware/validate-objectId'),
      headerPagination = require('../lib/middleware/write-header-pagination');

  server.get(resource_base_url, validateClient, function (req, res, next) {
    Resource.paginate({client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = resource_base_url;
      return next();
    });
  }, headerPagination);

  server.get(resource_base_url + '/:id', validateClient, validateObjectId, function (req, res, next) {
    Resource.findOne({_id: req.params.id, client: req.credentials.clientId}, function(err, resource){
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  });

  server.get(resource_base_url + '/:id/sensors', validateClient, function (req, res, next) {
    Sensor.paginate({device: req.params.id, client: req.credentials.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resource_base_url = resource_base_url + '/' + req.params.id + '/sensors';
      req.resources = resources;
      return next();
    });
  }, headerPagination);

  server.post(resource_base_url, validateClient, function (req, res, next) {
    Resource.create(extend(req.body, {client: req.credentials.clientId}), function (err, new_resource) {
      if (err)
        return next(err);
      res.send(201, new_resource);
      return next();
    });
  });

  server.patch(resource_base_url + '/:id', validateClient, validateObjectId, function (req, res, next) {
    if ('client' in req.body) {
      delete req.body.client;
    }
    Resource.findOneAndUpdate({_id: req.params.id, client: req.credentials.clientId},
      {$set: req.body}, {upsert: true, safe:true}).exec(function(err, resource) {
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  });

  server.del(resource_base_url + '/:id', validateClient, validateObjectId, function (req, res, next) {
    Resource.find({_id: req.params.id, client: req.credentials.clientId}).remove(function(err){
      if (err)
        return next(err);
      res.send(204);
      return next();
    });
  });
};