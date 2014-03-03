var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');

function validateClient(req, res, next) {
  if (!req.clientId) {
    return res.sendUnauthorized();
  }
  next();
}

module.exports = function (server, config) {
  var resource_base_url = '/sensor',
      Resource = Sensor;

  function _header_next(req, res, next) {
    var header_link = "",
        fullURL = (req.isSecure() ? 'https':'http') + "://" + req.header('host') +
         (req.resource_base_url ? req.resource_base_url : resource_base_url) +
         '?per_page=' + req.results_per_page;

    header_link += '<' + fullURL + '&page=1>; rel="first"';
    header_link += ',<' + fullURL + '&page='+ req.page_count +'>; rel="last"';

    if (req.page_count > req.page) {
      header_link += ',<' + fullURL + '&page='+ (req.page +1) + '>; rel="next"';
    }
    if (req.page_count > 1) {
      header_link += ',<' + fullURL + '&page='+ (req.page -1) +'>; rel="prev"';
    }
    res.setHeader('Link', header_link);
    res.send(req.resources);
  }

  function _validateObjectId(req, res, next) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new restify.InvalidArgumentError());
    }
    return next();
  }

  server.get(resource_base_url, validateClient, function (req, res, next) {
    Resource.paginate({}, req.page, req.results_per_page, function (err, page_count, resources) {
      if (err)
        return next(err);

      req.page_count = page_count;
      req.resources = resources;
      return next();
    });
  }, _header_next);

  server.get(resource_base_url + '/:id', validateClient, _validateObjectId, function (req, res, next) {
    Resource.findOne({_id: req.params.id}, function(err, resource){
      if (err)
        return next(err);
      res.send(resource);
      return next();
    });
  });

  server.post(resource_base_url, validateClient, function (req, res, next) {
    Resource.create(req.body, function (err, new_resource) {
      if (err)
        return next(err);
      res.send(201, new_resource);
      return next();
    });
  });

  server.patch(resource_base_url + '/:id', validateClient, _validateObjectId, function (req, res, next) {
    Resource.findOneAndUpdate({_id: req.params.id}, {$set: req.body}, {upsert: true, safe:true}).exec(function(err, resource) {
      if (err)
        return next(err);
      res.send(resource);
      return next();
    });
  });

  server.del(resource_base_url + '/:id', validateClient, _validateObjectId, function (req, res, next) {
    Resource.find({_id: req.params.id}).remove(function(err){
      if (err)
        return next(err);
      res.send(204);
      return next();
    });
  });
};