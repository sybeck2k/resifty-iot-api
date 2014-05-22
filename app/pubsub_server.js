"use strict";

var restify           = require("restify"),
    restifyOAuth2     = require("restify-oauth2"),
    fs                = require('fs'),
    url               = require("url");


module.exports = function(config, log, redis_client, oauth_methods) {
  // initialize the Pub/Sub server
  var pubsub_server = require(config.pubsub_server.driver)(config, log, oauth_methods);

  return pubsub_server;
};