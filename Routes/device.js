var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');

function validateClient(req, res, next) {
  if (!req.clientId) {
    return res.sendUnauthorized();
  }
  next();
};

module.exports = function (server, config) {
  var resource_base_url = '/device',
      Resource = Device;

  server.get(resource_base_url, validateClient, function (req, res, next) {
    Resource.find(function (err, resources) {
      if (err)
        return next(err);
      res.send(resources);
      return next();
    });
  });

  server.get(resource_base_url + '/:id', validateClient, function (req, res, next) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new restify.InvalidArgumentError());
    }
    
    Resource.findOne({_id: req.params.id}, function(err, resource){
      if (err)
        return next(err);
      res.send(resource);
      return next();
    });
  });
      
  server.post(resource_base_url, validateClient, function (req, res, next) {
    Resource.create({ name: req.body.name }, function (err, new_resource) {
      if (err) 
        return next(err);
      res.send(201, new_resource);
    })
  });
}