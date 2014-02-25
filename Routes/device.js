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
    Resource.find(function (error, resources) {
      if (error)
        return next(error);
      res.send(resources);
      return next();
    });
  });

  server.get(resource_base_url + '/:id', validateClient, function (req, res, next) {
    Resource.findOne({_id: req.params.id}, function(err, resource){
      if (error)
        return next(error);
      res.send(resource);
      return next();
    });
  });
      
  server.post(resource_base_url, validateClient, function (req, res, next) {
    Resource.create({ name: req.body.name }, function (error, new_resource) {
      // If there are any errors, pass them to next in the correct format
      if (error) return next(error);
      res.send(201, new_resource);
    })
  });
}