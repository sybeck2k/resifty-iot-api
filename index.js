"use strict";

var Logger     = require('bunyan');
var mongoose   = require('mongoose');
var fs         = require('fs');
var redis      = require('redis');

var log = new Logger({
  name: 'restify-iot',
  streams: [
    {
      stream: process.stdout,
      level: 'debug'
    }
  ],
  serializers: {
    req: Logger.stdSerializers.req
  }
});


// Load configurations
var env     = process.env.NODE_ENV || 'dev';
var config  = require('./config.'+ env);
var models_path = require('path').normalize(__dirname) + '/app/models';
var db = mongoose.connection;

// Connect to MongoDB
mongoose.connect(config.db_url);

db.on('error', log.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  log.debug("Database connection opened.");
});

// Bootstrap models
fs.readdirSync(models_path).forEach(function (file) {
  log.debug("Loading model " + file);
  require(models_path + '/' +file);
});

var redis_uri = require("url").parse(config.redis_url);

// Connect Redis connection
var redis_client = redis.createClient(redis_uri.port, redis_uri.hostname);
if (redis_uri.auth) {
  redis_client.auth(redis_uri.auth.split(":")[1]);
}

// get the Oauth hooks
var oauth_methods = require("./app/lib/oauth-hooks")(config, log, redis_client);

// get the driver for the sensor readings storage
var sensor_reading_driver = require("./app/lib/pubsub-server/" + config.sensor_storage.driver)(config, log);

// initialize the driver of the sensor readings storage
sensor_reading_driver.init(function(err, driver){
  if (err)
    throw err;
});

// initialize the API Server
var api_server = require('./app/api_server')(config, log, redis_client, oauth_methods, "./app/lib/sensor-storage/" + sensor_reading_driver);

// initialzie the PubSub Server
var pubsub_server = require('./app/pubsub_server')(config, log, redis_client, oauth_methods);

//put together API Server and PubSub Server
require('./app/integrate_api_pubsub')(config, log, api_server, pubsub_server);

// ..and finally open the server!
api_server.listen(config.port);

log.info("API server listening on port " + config.port);