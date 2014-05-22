"use strict";

var restify   = require('restify'),
    mongoose  = require('mongoose'),
    Sensor    = mongoose.model('Sensor'),
    _         = require('underscore'),
    microtime = require('microtime');

module.exports = function (pubsub_server) {
  var routes = {};

  routes.setState = function (req, res, next) {

  };

  routes.getState = function (req, res, next) {

  };

  return routes;
};
