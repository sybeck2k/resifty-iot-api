"use strict";

var faye     = require('faye'),
    redis    = require('faye-redis'),
    crypto   = require('crypto'),
    mongoose = require('mongoose'),
    Sensor   = mongoose.model('Sensor'),
    log,
    server_client_uuid;

function write_datapoint(sensor_id, message) {
  log.warn(sensor_id, message);
  
  Sensor.findOne({_id: sensor_id, client: message.ext.credentials.clientId}, function(err, resource){
    if (err) {
      log.warn(err);
    }
    if (!resource) {
      log.warn('not found');
    }
    var sensor = resource.toJSON();
    log.info(sensor);
  });
}

function init_server_client(client) {
  client.callback(function() {
    log.debug('[PUBLISH SUCCEEDED]');
  });
  client.errback(function(error) {
    log.debug('[PUBLISH FAILED]', error);
  });

  function generate_random_server_token(len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
  }

  //every hour, regenerate the server token (warning this is maniacal)
  setInterval(function(){
    log.debug("Regenerating server-client token");
    server_client_uuid = generate_random_server_token(40);
  },3600000);
  server_client_uuid = generate_random_server_token(40);

  // simulate the authentication via the random token
  client.addExtension({
    outgoing: function(message, callback) {
      message.ext = message.ext || {};
      message.ext.token = server_client_uuid;
      callback(message);
    }
  });
}

module.exports = function(config, _logger, oauth_methods) {
  log =  _logger.child({component: 'faye'});

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

  var bayeux_server = new faye.NodeAdapter({
    mount:    '/pubsub',
    timeout:  25,
    engine: engine
  });
  
  //initialize the client
  var client = bayeux_server.getClient();
  init_server_client(client);

  var sensor_reading_route_regexp = new RegExp(/^\/sensor-reading\/([0-9a-fA-F]{24})$/);

  bayeux_server.addExtension({
    incoming: function(message, cb) {
      //ignore handshake and connect
      if (message.channel === '/meta/handshake' || message.channel === '/meta/connect'){
        cb(message);
        return;
      }

      if (!message.ext || !message.ext.token) {
        log.debug("Message without token", message);
        message.error = '403::Authentication required';
        cb(message);
        return;
      }

      //always authorize server-sent publications
      if (message.ext.token === server_client_uuid) {
        cb(message);
        return;
      }

      //subscriptions and publications must be authenticated
      var req_placeholder = {};
      //authorization of the token
      oauth_methods.authenticateToken(message.ext.token, req_placeholder, function(err, authenticated){
        delete message.ext.token;
        message.ext.credentials = req_placeholder.credentials;
        if(!authenticated) {
          message.error = '403::Authentication required';
          cb(message);
        } else {
          log.debug('Accepting message on ', message.channel);
          //and dispatch /sensor-reading to a corresponding action
          var regexp_matches;
          if (!!(regexp_matches = message.channel.match(sensor_reading_route_regexp))) {
            write_datapoint(regexp_matches[1], message);
          }
          cb(message);
        }
      });
    }
  });

  //we add the Publish method to the server, compatible with the one of MQTT
  bayeux_server.publish = function(message, cb) {
    var publication_deferred = client.publish(message.topic, message);

    publication_deferred.errback(function(err){
      log.warn({error: err}, "Failed publication of message");
      cb(false);
    });
    publication_deferred.errback(function(err){
      cb(true);
    });
  };

  log.info("Pubsub server mounted at /pubsub");
  return bayeux_server;
};
