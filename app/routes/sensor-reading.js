"use strict";

module.exports = function (sensor_reading_driver, pubsub_server) {
  var routes = {};

  routes.createPoint = function (req, res, next) {
    //@todo add the time, if not explicitly set
    //mqtt-compliant
    var pubsub_message = {
      topic: '/sensor-reading/' + req.sensor.id,
      payload: req.body.value,
      qos: 0, // 0, 1, or 2
      retain: req.sensor.persistant
    };

    pubsub_server.publish(pubsub_message);

    //store the data point(s) only if the sensor is persistant
    if (req.sensor.persistant) {
      var point = { attr : req.body.value, time : new Date()};
      sensor_reading_driver.create(req.sensor, point, function (err, new_point){
        if (err)
          return next(err);
        res.send(201);
        return next();
      });
    } else {
      res.send(200);
      return next();
    }
  };

  return routes;
};
