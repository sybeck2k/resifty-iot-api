"use strict";

var influx = require('influx'),
    _      = require('underscore'),
    driver = {},
    log, config, influx_client;

driver.init = function(cb) {
  //connect to Influx DB
  influx_client = influx(config.sensor_storage.host,  config.sensor_storage.port,
    config.sensor_storage.username,  config.sensor_storage.password, config.sensor_storage.database);

  influx_client.getDatabaseNames(function(err, database_names){

    if (err) {
      return cb(err, null);
    }
    return cb(null, influx_client);
  });
};

//add a new series of points
driver.create = function(sensor, datapoints, cb) {
  
  //we have to transform the datapoints into the influxdb expected format {attr : value, time : new Date()}
  //for geographical points, we are writing 2 series
  if (sensor.type === 'geo') {
    var series_lat_datapoints = [],
        series_lng_datapoints = [],
        series                = {};

    _.each(datapoints, function(d) {
      series_lat_datapoints.push({"attr": d.attr[0], "time": d.at});
      series_lng_datapoints.push({"attr": d.attr[1], "time": d.at});
    });

    series["sensor_" + sensor.id + "_lat"] = series_lat_datapoints;
    series["sensor_" + sensor.id + "_lng"] = series_lng_datapoints;

    influx_client.writeSeries(series, {time_precision: 'u'}, function (err, influx_response_body){
      log.debug(influx_response_body);
      if (err) {
        return cb(err, series);
      }
      return cb(null, series);
    });

  } else {
    var series_name = "sensor_" + sensor.id,
        influx_datapoints = [];

    influx_datapoints = _.map(datapoints, function(d){
      var attr = d.value === true ? 1 : (d.value === false ? 0 : d.value);
      return {"attr": attr, "time": d.at};
    });
    
    influx_client.writePoints(series_name, influx_datapoints, {time_precision: 'u'}, function (err, influx_response_body){
      log.debug(influx_response_body);
      if (err) {
        return cb(err, influx_datapoints);
      }
      return cb(null, influx_datapoints);
    });
  }
};

module.exports = function(_config, _logger){
  config = _config;
  log =  _logger.child({component: 'influx-db'});
  
  return driver;
};
