"use strict";

var restify           = require("restify");
var restifyOAuth2     = require("restify-oauth2");
var fs                = require('fs');
var url               = require("url");

// Paths

var routes_path = require('path').normalize(__dirname) + '/routes';

module.exports = function(config, log) {
  // get the Oauth hooks
  var oauth_methods = require("./lib/oauth-hooks")(config, log);
  // get the driver for the sensor readings storage
  var sensor_reading_driver = require(config.sensor_storage.driver)(config, log);

  // initialize the driver of the sensor readings storage
  sensor_reading_driver.init(function(err, driver){
    if (err)
      throw err;
  });

  var api_server = restify.createServer({
    name: "Example Restify-OAuth2 Resource Owner Password Credentials Server",
    version: require("../package.json").version,
    log: log,
    formatters: {
      'application/json': function(req, res, body) {
        if (body instanceof Error) {
          if (body.name === 'ValidationError') {
            body = {
              message: body.message,
              errors: body.errors
            };
          } else {
            res.statusCode = body.statusCode || 500;
            if (body.body) {
              body = body.body;
            } else {
              body = {
                message: body.message
              };
            }
          }
        } else if (Buffer.isBuffer(body)) {
          body = body.toString('base64');
        }

        var data = JSON.stringify(body);
        res.setHeader('Content-Length', Buffer.byteLength(data));

        return (data);
      },
      "application/hal+json": function (req, res, body) {
        return res.formatters["application/json"](req, res, body);
      }
    }
  });


  api_server.use(restify.authorizationParser());
  api_server.use(restify.bodyParser({ mapParams: false }));
  api_server.pre(restify.pre.sanitizePath());

  api_server.pre(require("./lib/middleware/parse-pagination")(config));

  restifyOAuth2.cc(api_server, { tokenEndpoint: "/token", hooks: oauth_methods });

  // initialize the Pub/Sub server
  var pubsub_server = require(config.pubsub_server.driver)(config, log, oauth_methods);

  pubsub_server.attach(api_server);

  api_server.on('close', function(){
    pubsub_server.close();
  });

  //anything that gets here by the /pubsub path is actually handled by the pubsub server and thus is not a real 404!
  var rePubSubPattern = new RegExp(/^\/pubsub/);
  api_server.on('NotFound', function (req, res, cb) {
    if (!req.url.match(rePubSubPattern)) {
      res.send(404, req.url + ' was not found');
    }
  });
  
  // Bootstrap routes
  require(routes_path + '/index')(api_server, config, sensor_reading_driver, pubsub_server);

  api_server.get('/', function (req, res) {
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
    
    res.send(response);
  });

  api_server.listen(config.port);
  log.info("API server listening on port " + config.port);

  return api_server;
};