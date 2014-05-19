"use strict";

var restify   = require('restify'),
    mongoose  = require('mongoose'),
    Sensor    = mongoose.model('Sensor'),
    _         = require('underscore'),
    microtime = require('microtime');

module.exports = function (sensor_reading_driver, pubsub_server) {
  var routes = {};

/*
"datapoints":[
        {"at":"2013-04-22T00:35:43Z","value":"42"},
        {"at":"2013-04-22T00:55:43Z","value":"84"},
        {"at":"2013-04-22T01:15:43Z","value":"41"},
        {"at":"2013-04-22T01:35:43Z","value":"83"}
        ],
"current_value" : "40"
*/
  // Validates that the given reading is formally correct and consistant with the sensor type
  function normalizeDatapoints(sensor, input_data, log) {
    var datapoints = [],
        normalized_datapoints = [];

    //check that at least datapoints or current value are set consistently with the sensor type
    if (!input_data.datapoints && !input_data.current_value) {
      log.debug("Missing mandatory input parameter current_value and/or datapoints");
      return false;
    }

    if (input_data.datapoints){
      if (_.isArray(input_data.datapoints)) {
        datapoints = _.clone(input_data.datapoints);
      } else {
        log.debug("Invalid input parameter - datapoints is expected to be an array");
        return false;
      }
    }

    //parse the datapoints for errors, and normalize the time to microseconds, if necessary
    var _to_microsec = function(t){
      return parseInt(t, 10);
    };
    if (sensor.time_precision === 's') {
      _to_microsec = function(t){
        return parseInt(t, 10) * 1000000;
      };
    } else if (sensor.time_precision === 'm') {
      _to_microsec = function(t){
        return parseInt(t, 10) * 1000;
      };
    }
    //normalize input values, and check the input format to be consistant with the sensor type
    var _normalize_values = function(d){
      return parseFloat(d);
    };
    if (sensor.type === 'geo') {
      _normalize_values = function(d){
        if (!_.isArray(d) || d.length!==2) {
          log.debug("Invalid input parameter - current value must be an array for a geo reading");
          return false;
        }
        return [parseFloat(d[0]), parseFloat(d[1])];
      };
    } else if (sensor.type === 'state') {
      _normalize_values = function(d){
        return !!d;
      };
    }

    var has_an_invalid_datapoint = _.find(datapoints, function(d){
      //every datapoint must have the keys at and value
      if (!_.has(d, "at") || !_.has(d, "value")) {
        return true;
      }
      var normalized_value = _normalize_values(d.value);
      //every datapoint value must be consistant with its sensor type
      if (normalized_value === false) {
        return true;
      }

      normalized_datapoints.push({"at": _to_microsec(d.at), "value": normalized_value});
      return false;
    });

    if (has_an_invalid_datapoint) {
      return false;
    }

    //transform the current_value into a datapoint, and push it to the stack
    if (input_data.current_value) {
      var hr_time = process.hrtime(),
          cur_microtime = microtime.now(),
          normalized_value = _normalize_values(input_data.current_value);
      if (normalized_value === false) {
        return false;
      }
      normalized_datapoints.push({"at": cur_microtime, "value": normalized_value});
    }

    return normalized_datapoints;
  }

  routes.createPoint = function (req, res, next) {
    // Validates that the given sensor exists and is associated to the authenticated client
    Sensor.findOne({_id: req.params.id, client: req.credentials.clientId}, function(err, sensor){
      next.ifError(err);
      if (!sensor) {
        return next(new restify.ResourceNotFoundError());
      }
      //we have to process the req.body, to see what format we are 
      var normalized_datapoints = normalizeDatapoints(sensor, req.body, req.log);
      if(normalized_datapoints === false) {
        return next(new restify.InvalidArgumentError());
      }
      
      //mqtt-compliant
      var pubsub_message = {
        topic: '/sensor-reading/' + sensor.id,
        payload: normalized_datapoints,
        qos: 0, // 0, 1, or 2
        retain: sensor.persistant
      };

      pubsub_server.publish(pubsub_message, function(err){
        //we ignore any error on the publication
        req.log.warn(err);
      });

      //store the data point(s) only if the sensor is persistant
      if (sensor.persistant) {
        sensor_reading_driver.create(sensor, normalized_datapoints, function (err, new_points){
          next.ifError(err);
          //if we wrote only 1 datapoint, return an object
          if (normalized_datapoints.length === 1) {
            normalized_datapoints = normalized_datapoints[0];
          }
          res.send(201, normalized_datapoints);
          return next();
        });
      } else {
        //if we wrote only 1 datapoint, return an object
        if (normalized_datapoints.length === 1) {
          normalized_datapoints = normalized_datapoints[0];
        }
        res.send(200, normalized_datapoints);
        return next();
      }
    });
    
  };


  return routes;
};
