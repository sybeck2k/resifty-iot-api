"use strict";

/*
 * Main Imports
 */
var restify           = require("restify");
var restifyOAuth2     = require("restify-oauth2");
var fs                = require('fs');
var influx            = require('influx');
var url               = require("url");

// Paths

var routes_path = require('path').normalize(__dirname) + '/routes';

module.exports = function(config, log) {
  // get the Oauth hooks
  var oauth_methods = require("./lib/oauth-hooks")(config, log);

  //connect to Influx DB
  var influx_client = influx(config.influx_db.host,  config.influx_db.port,
    config.influx_db.username,  config.influx_db.password, config.influx_db.database);

  influx_client.getDatabaseNames(function(err, database_names){
    if(err) throw err;
    if (database_names.indexOf(config.influx_db.database) === -1) {
      influx_client.createDatabase(config.influx_db.database, function(err) {
        if(err)
          throw err;
        log.info('Created Infulx database');
      });
    }
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

  // Setup the Restify Server with Oauth2
  api_server.use(restify.authorizationParser());
  api_server.use(restify.bodyParser({ mapParams: false }));
  //server.use(restify.queryParser({ mapParams: false }));
  api_server.pre(restify.pre.sanitizePath());

  // get pagination info
  api_server.pre(function(req, res, next) {
    //pagination makes sense only on `get` requests!
    if (req.method !== 'GET') {
      return next();
    }
    var query = url.parse(req.url,true).query;

    var requst_pagination_page_number = 'page' in query ? parseInt(query.page) : 1,
        requst_pagination_per_page    = 'per_page' in query ? parseInt(query.per_page) : config.pagination.results_per_page;

    if (requst_pagination_page_number === 0 ) {
      return next(new restify.InvalidArgumentError("Pages must be 1-indexed"));
    }

    if (requst_pagination_per_page > config.pagination.max_results) {
      requst_pagination_per_page = config.pagination.max_results;
    }
    req.results_per_page = requst_pagination_per_page;
    req.page = requst_pagination_page_number;

    return next();
  });

  restifyOAuth2.cc(api_server, { tokenEndpoint: "/token", hooks: oauth_methods });

  // acrivate the MQTT server also
  var mosca_server = require('./mqtt_server')(config, log);

  api_server.on('close', function(){
    mosca_server.close();
  });

  // Bootstrap routes
  fs.readdirSync(routes_path).forEach(function (file) {
    log.debug("Attaching route " + file);
    require(routes_path + '/' +file)(api_server, config, influx_client);
  });


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