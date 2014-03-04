var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');
var extend          = require('util')._extend;

module.exports = function (server, config) {
  var resource_base_url = '/sensor',
      Resource = Sensor,
      route_utils = require('../lib/route-utils');

  server.get(resource_base_url, route_utils.validateClient, function (req, res, next) {
    Resource.paginate({client: req.clientId}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resources = resources;
      req.resource_base_url = resource_base_url;
      return next();
    });
  }, route_utils.header_next);

  server.get(resource_base_url + '/:id', route_utils.validateClient, route_utils.validateObjectId, function (req, res, next) {
    Resource.findOne({_id: req.params.id, client: req.clientId}, function(err, resource){
      if (err)
        return next(err);
      if (!resource)
        res.send(404);
      else
        res.send(resource);
      return next();
    });
  });

  server.post(resource_base_url, route_utils.validateClient, function (req, res, next) {
    Resource.create(extend(req.body, {client: req.clientId}), function (err, new_resource) {
      if (err)
        return next(err);
      res.send(201, new_resource);
      return next();
    });
  });

  server.patch(resource_base_url + '/:id', route_utils.validateClient, route_utils.validateObjectId, function (req, res, next) {
    Resource.findOneAndUpdate({_id: req.params.id, client: req.clientId}, {$set: req.body}, {upsert: true, safe:true}).exec(function(err, resource) {
      if (err)
        return next(err);
      res.send(resource);
      return next();
    });
  });

  server.del(resource_base_url + '/:id', route_utils.validateClient, route_utils.validateObjectId, function (req, res, next) {
    Resource.find({_id: req.params.id, client: req.clientId}).remove(function(err){
      if (err)
        return next(err);
      res.send(204);
      return next();
    });
  });
};