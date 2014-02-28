var mongoose        = require('mongoose');
var restify         = require('restify');
var Device          = mongoose.model('Device');
var Sensor          = mongoose.model('Sensor');

function validateClient(req, res, next) {
  if (!req.clientId) {
    return res.sendUnauthorized();
  }
  next();
};

module.exports = function (server, config, influx_client) {
  var resource_base_url = '/sensor-reading/:sensor_id',
      Resource = Sensor;

  function _header_next(req, res, next) {
    var header_link = "",
        fullURL = (req.isSecure() ? 'https':'http') + "://" + req.header('host') +
         (req.resource_base_url ? req.resource_base_url : resource_base_url) + 
         '?per_page=' + req.results_per_page;

    header_link += '<' + fullURL + '&page=1>; rel="first"';
    header_link += ',<' + fullURL + '&page='+ req.page_count +'>; rel="last"';

    if (req.page_count > req.page) {
      header_link += ',<' + + fullURL + '&page='+ (req.page +1) + '>; rel="next"';
    }
    if (req.page_count > 1) {
      header_link += ',<' + fullURL + '&page='+ (req.page -1) +'>; rel="prev"';
    }
    res.setHeader('Link', header_link);
    res.send(req.resources);
  };

  function validateSensor(req, res, next) {
    if (!req.params.sensor_id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new restify.InvalidArgumentError());
    }
    Resource.findOne({_id: req.params.sensor_id}, function(err, resource){
      if (err)
        return next(err);
      req.sensor = resource;
      req.series_name = "sensor_" + resource.id;
      return next();
    });
  };

  server.post(resource_base_url, validateClient, validateSensor, function (req, res, next) {
    var point = { attr : req.body.value, time : new Date()};
    influx_client.writePoint(req.series_name, point, {time_precision: 'm'}, function (err, new_point){
      if (err)
        return next(err);
      res.send(201, new_point);
      return next();
    });
  });
}