"use strict";

var restify           = require("restify");
var restifyOAuth2     = require("restify-oauth2");
var fs                = require('fs');
var url               = require("url");

// Paths

var routes_path = require('path').normalize(__dirname) + '/routes';

module.exports = function(config, log, redis_client, oauth_methods, sensor_reading_driver) {
  var api_server = restify.createServer({
    name: "iot API server",
    version: require("../package.json").version,
    log: log,
    formatters: {
      'application/json': function(req, res, body) {
        if (body instanceof Error) {
          if (body.name === 'ValidationError') {
            res.statusCode = body.statusCode || 422;
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
  api_server.pre(require("./lib/middleware/parse-prefer-header"));

  restifyOAuth2.cc(api_server, { tokenEndpoint: "/token", hooks: oauth_methods });

  //anything that gets here by the /pubsub path is actually handled by the pubsub server and thus is not a real 404!
  var rePubSubPattern = new RegExp(/^\/pubsub/);
  api_server.on('NotFound', function (req, res, cb) {
    if (!req.url.match(rePubSubPattern)) {
      res.send(404, req.url + ' was not found');
    }
  });
  
  // Bootstrap routes
  require(routes_path + '/index')(api_server, config, sensor_reading_driver);

  return api_server;
};