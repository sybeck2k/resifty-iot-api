"use strict";

var restify   = require('restify'),
    mongoose  = require('mongoose'),
    Sensor    = mongoose.model('Sensor'),
    _         = require('underscore'),
    microtime = require('microtime');

module.exports = function (pubsub_server) {
  var routes = {};

  routes.setState = function (req, res, next) {
    /*
     1 - check Prefer header: 
        if available and < than max wait timeout,
         - trigger event to set state, and wait for event-response
         - if timeout of prefer wait, trigger timeout event and return  202
         - if not return response and 200
         

    */
    //trigger
  };

  routes.getState = function (req, res, next) {

  };

  return routes;
};
