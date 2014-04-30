"use strict";

var driver = {},
    log, config;

driver.init = function(cb) {
  cb(null, true);
};

//add a new datapoint
driver.create = function(sensor, points, cb) {
  log.debug("Writing in-memory point(s)", points);
  return cb(null, null);
};

module.exports = function(_config, _logger){
  config = _config;
  log =  _logger.child({component: 'memory-pointwriter'});
  
  return driver;
};