"use strict";

var faye  = require('faye'),
    redis = require('faye-redis'),
    http  = require('http');

module.exports = function(config, log, oauth_methods) {

  var redis_uri = require("url").parse(config.redis_url);

  var engine = {
    type: redis,
    host: redis_uri.hostname,
    port: redis_uri.port,
    namespace: 'faye'
  };

  if (redis_uri.auth) {
    engine.password = redis_uri.auth.split(":")[1];
  }

  var bayeux = new faye.NodeAdapter({
    mount:    '/pubsub',
    timeout:  25,
    engine: engine
  });

  log.info("Faye pubsub server mounted at /pubsub");
  return bayeux;
};
