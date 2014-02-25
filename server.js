"use strict";

/*
 * Main Imports
 */
var restify         = require("restify");
var restifyOAuth2   = require("restify-oauth2");
var mongoose        = require('mongoose');
var fs              = require('fs');
var Logger          = require('bunyan');
var influx          = require('influx');

// Load configurations
var env     = process.env.NODE_ENV || 'development';
var config  = require('./Configs/config')[env];

// Paths
var models_path = config.root + '/Models'
var config_path = config.root + '/Configs'
var routes_path = config.root + '/Routes' 

var log = new Logger({
  name: 'restify-iot',
  streams: [
    {
      stream: process.stdout,
      level: 'debug'
    },
    {
      path: '/tmp/restify.log',
      level: 'trace'
    }
  ],
  serializers: {
    req: Logger.stdSerializers.req
  },
});

// Connect to MongoDB
mongoose.connect(config.db_url);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  log.info("Database connection opened.");
});

// Bootstrap models
fs.readdirSync(models_path).forEach(function (file) {
  log.debug("Loading model " + file);
  require(models_path + '/' +file);
});


//connect to Influx DB
var influx_client = influx(config.influx_db.host,  config.influx_db.port, 
  config.influx_db.username,  config.influx_db.password, config.influx_db.database);

influx_client.getDatabaseNames(function(err, database_names){
  if(err) throw err;
  if (database_names.indexOf(config.influx_db.database) === -1) {
    influx_client.createDatabase(config.influx_db.database, function(err) {
      if(err) throw err;
      log.info('Created Infulx database');
    });
  }
});


// Load hooks after models have been loaded
var hooks = require("./Configs/hooks");

/* 
 * NB: we're using [HAL](http://stateless.co/hal_specification.html) here to communicate RESTful links among our
 * resources, but you could use any JSON linking format, or XML, or even just Link headers.
 */ 
var server = restify.createServer({
  name: "Example Restify-OAuth2 Resource Owner Password Credentials Server",
  version: require("./package.json").version,
  log: log, 
  formatters: {
    "application/hal+json": function (req, res, body) {
      return res.formatters["application/json"](req, res, body);
    }
  }
});

// Setup the Restify Server with Oauth2
server.use(restify.authorizationParser());
server.use(restify.bodyParser({ mapParams: false }));

server.pre(restify.pre.sanitizePath());

restifyOAuth2.cc(server, { tokenEndpoint: "/token", hooks: hooks });

require(routes_path + '/oauth')(server, config);
require(routes_path + '/device')(server, config);


server.get('/', function (req, res) {
  var response = {
    _links: {
      self: { href: '/' }
    }
  };

  response._links["oauth2-token"] = {
    "href": '/token',
    "grant-types": "client_credentials",
    "token-types": "bearer"
  };
  

  res.contentType = "application/hal+json";
  res.send(response);
});

var port = config.port;
    server.listen(port);

module.exports = server;