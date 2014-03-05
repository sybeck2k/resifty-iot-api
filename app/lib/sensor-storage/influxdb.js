var influx            = require('influx');
var driver = {},
    log, config, influx_client;

driver.init = function(cb) {
  //connect to Influx DB
  influx_client = influx(config.sensor_storage.host,  config.sensor_storage.port,
    config.sensor_storage.username,  config.sensor_storage.password, config.sensor_storage.database);

  influx_client.getDatabaseNames(function(err, database_names){
    if (err)
      return (err, null);
    return (influx_client, null);
  });
};

/*
* 
*/
driver.create = function(sensor, points, cb) {
  var series_name = "sensor_" + sensor.id;
  influx_client.writePoint(series_name, points, {time_precision: 'm'}, function (err){
    if (err) {
      return cb(err, null);
    }
    return cb(null, null);
  });
};

module.exports = function(_config, _log){
  config = _config;
  log    = _log;
  
  return driver;
};