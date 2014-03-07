"use strict";

var mongoose  = require('mongoose');
var crypto    = require("crypto");
var Client    = mongoose.model('ClientKey');
var Token     = mongoose.model('ClientToken');
var redis     = require('redis');
var restify   = require('restify');
var extend    = require('util')._extend;
var hooks     = {};
var logger, redisClient, redis_utils = {};


function generateToken(data)  {
  var random          = Math.floor(Math.random() * 100001);
  var timestamp       = (new Date()).getTime();
  var sha256          = crypto.createHmac("sha256", random + "WOOT" + timestamp);

  return sha256.update(data).digest("base64");
}

// get the token data from Redis and extract the scope variable
redis_utils.getTokenData = function(token_string, cb) {
  redisClient.hgetall(token_string, function(err, token){
    if (err) {
      return cb(err, null);
    }
    if (token === null) {
      return cb(null, null);
    }
    token.scope = token.scope.split(",");
    return cb(null, token);
  });
};

// store in redis the token data (best effort)
redis_utils.setTokenData = function(token) {
  var token_clone = extend({}, token);
  delete token_clone.token;
  token_clone.scope = token.scope.join(",");
  redisClient.hmset(token.token, token_clone, function(err){
    if (err) {
      logger.warn("Impossible to persist token data in Redis: " + err);
    }
  });
};

// Validates a client
hooks.validateClient = function (clientId, clientSecret, cb) {
  // Call back with `true` to signal that the client is valid, and `false` otherwise.
  // Call back with an error if you encounter an internal server error situation while trying to validate.
  Client.findOne({ client: clientId, secret: clientSecret }, function (err, client) {
    if(err){
      cb(null, false);
    }else {
      if( client === null ) {
        cb(null, false);
      } else {
        cb(null, true);
      }
    }
  });
};

// Grants a token to the given ClientId and ClientSecret if they are valid
// the scope variable is an array of comma-separated strings
hooks.grantClientToken = function (clientId, clientSecret, scope, cb)  {
  var scopes = scope ? scope.split(",") : [];
  if (scopes.length === 0) {
    return cb(new restify.InvalidArgumentError("The token must have at least one scope"), null);
  }

  Client.where( 'client', new RegExp('^' + clientId + '$', 'i') ).findOne(function (err, client) {
    if (err) {
      cb(null, false);
    } else if (!client) {
      cb(null, false);
    } else if (client.authenticate(clientSecret)) {
      var token       = generateToken(clientId + ":" + clientSecret);
      Token.create({ clientId: client._id, token: token, scope: scopes }, function (err, newToken) {
        if (err)
          throw new Error("Impossible to persist new Token");
        // Store the token in the Redis datastore so we can perform fast queries on it
        redis_utils.setTokenData(newToken.toJSON());
        // Call back with the token so Restify-OAuth2 can pass it on to the client.
        return cb(null, token, scopes);
      });
    } else {
      cb(null, false);
    }
  });
};

// Authenticate a given token, uses redis as a cache server
hooks.authenticateToken = function (token, cb)  {
  // Query the Redis store for the Auth Token 
  redis_utils.getTokenData(token, function (err, authToken) {
    /* 
     * If we get an error fall back to the MongoDb incase
     * Redis has deleted the token
     */
    if(err || authToken === null){
      Token.findOne({ token: token }, function (err, authToken) {
        if(err){
          cb(null, false);
        }else {
          if( authToken === null ) {
            cb(null, false);
          } else {
            authToken = authToken.toJSON();
            redis_utils.setTokenData(authToken);
            return cb(null, authToken);
          }
        }
      });
    } else {
      // Return the token clientId
      return cb(null, authToken);
    }
  });
};

// Authorize the given client for the given request using the scope parameter of the token
hooks.authorizeToken = function (client_data, req, cb)  {
  if (client_data.scope.indexOf('admin') !== -1) {
    return cb(null, true);
  }

  return cb(null, false);
};

module.exports = function(_config, _logger){
  var redis_uri = require("url").parse(_config.redis_url);

  // Connect Redis connection
  redisClient = redis.createClient(redis_uri.port, redis_uri.hostname);
  if (redis_uri.auth) {
    redisClient.auth(rtg.auth.split(":")[1]);
  }

  logger = _logger;
  
  return hooks;
};