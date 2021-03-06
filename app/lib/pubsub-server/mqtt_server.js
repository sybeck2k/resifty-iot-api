var mosca = require('mosca');

module.exports = function(config, log) {
  var oauth_methods = require("../oauth-hooks")(config, log);

  var ascoltatore = {
    type: 'redis',
    port: config.pubsub_server.redis_port,
    host: config.pubsub_server.redis_host
  };

  var settings = {
    port:  config.pubsub_server.port,
    backend: ascoltatore
  };

  // fired when the mqtt server is ready
  function setup() {

    // we will re-use the oauth-authentication, so the password is actually useless here
    var authenticate = function(client, username, password, callback) {
      oauth_methods.authenticateToken(username, function(resp, client){
        if (client === false) {
          callback(null, false);
        } else {
          client.user = client;
          callback(null, true);
        }
      });
    };

    // In this case the client authorized as alice can publish to /users/alice taking
    // the username from the topic and verifing it is the same of the authorized user
    var authorizePublish = function(client, topic, payload, callback) {
      callback(null, client.user === topic.split('/')[1]);
    };

    // In this case the client authorized as alice can subscribe to /users/alice taking
    // the username from the topic and verifing it is the same of the authorized user
    var authorizeSubscribe = function(client, topic, callback) {
      callback(null, client.user === topic.split('/')[1]);
    };

    server.authenticate = authenticate;
    server.authorizePublish = authorizePublish;
    server.authorizeSubscribe = authorizeSubscribe;
    log.info("MQTT server listening on port " + settings.port);
  }

  var server = new mosca.Server(settings);
  server.on('ready', setup);

  // fired when a message is published
  server.on('published', function(packet, client) {
    log.debug('Published payload', packet.payload);
  });

  return server;
};