"use strict";

var mongoose  = require('mongoose');
var crypto    = require("crypto");
var Client    = mongoose.model('ClientKey');
var Token     = mongoose.model('ClientToken');
var redis     = require('redis');
var restify   = require('restify');
var extend    = require('util')._extend;
var Promise   = require("bluebird");
var hooks     = {};
var log, redis_client, redis_utils = {};


function generateToken(data)  {
  var random          = Math.floor(Math.random() * 100001);
  var timestamp       = (new Date()).getTime();
  var sha256          = crypto.createHmac("sha256", random + "WOOT" + timestamp);

  return sha256.update(data).digest("base64");
}

// get the token data from Redis and extract the scope variable
redis_utils.getTokenData = function(token_string, cb) {
  redis_client.hgetall(token_string, function(err, token){
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
  redis_client.hmset(token.token, token_clone, function(err){
    if (err) {
      log.warn("Impossible to persist token data in Redis: " + err);
    }
  });
};

// Grants a token to the given credentials.{clientId,clientSecret} if they are valid
hooks.grantClientToken = function (credentials, req, cb)  {
  Client.findOne({'client': new RegExp('^' + credentials.clientId + '$', 'i')}, function (err, client) {
    if (err) {
      log.error({error: err}, "Impossible to retrieve the client from the DB");
      return cb(new restify.InternalError(), false);
    }
    if (!client) {
      return cb(null, false);
    }

    client.authenticate(credentials.clientSecret, function(err, is_authenticated){
      if (!is_authenticated) {
        return cb(null, false);
      }
      //store the mongodb ID of the client for reference when generating the token in the grantScopes func
      req.clientObjId = client._id;
      var token       = generateToken(credentials.clientId + ":" + client.secretHash);
      return cb(null, token);
    });
  });
};

// Grants scopes to the given credentials.{clientId,clientSecret,token} if they are valid
hooks.grantScopes = function (credentials, scopesRequested, req, cb) {
  if (!req.clientObjId) {
    log.error("Missing clientObjId parameter");
    return cb(new restify.InternalError(), false);
  }
  
  Token.create({ clientId: req.clientObjId, token: credentials.token, scope: scopesRequested }, function (err, newToken) {
    if (err) {
      log.error({error: err}, "Impossible to persist new token");
      return cb(new restify.InternalError(), false);
    }
      
    // Store the token in the Redis datastore so we can perform fast queries on it
    redis_utils.setTokenData(newToken.toJSON());
    // Call back with the token so Restify-OAuth2 can pass it on to the client.
    return cb(null, scopesRequested);
  });

  // Call back with the actual set of scopes granted.
  //cb(null, scopesRequested);

  // We could also call back with `false` to signal that the requested scopes are invalid, unknown, or mismatched with
  // the given credentials. Or we could call back with an error for an internal server error situation.
};

// Authenticate a given token, uses redis as a cache server
hooks.authenticateToken = function (token, req, cb)  {
  // Query the Redis store for the Auth Token 
  redis_utils.getTokenData(token, function (err, authToken) {
    /* 
     * If we get an error fall back to the MongoDb incase
     * Redis has deleted the token
     */
    if(err || authToken === null){
      Token.findOne({ token: token }, function(err, authToken){
        if (err) {
          log.error({error: err}, "Impossible to retrieve the token from the DB");
          return cb(new restify.InternalError(), false);
        }
        if (!authToken) {
          return cb(null, false);
        }
        authToken = authToken.toJSON();
        redis_utils.setTokenData(authToken);
        if (req) {
          req.credentials = authToken;
        }
        return cb(null, true);
      });
    } else {
      if (req) {
        req.credentials = authToken;
      }
      return cb(null, true);
    }
  });
};

module.exports = function(_config, _logger, _redis_client){

  redis_client =_redis_client;
  log =  _logger.child({component: 'oauth'});
  hooks.log = log;

  return hooks;
};