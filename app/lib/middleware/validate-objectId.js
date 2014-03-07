"use strict";

var restify         = require('restify');

// HTTP Middleware to Validate a mongo standard ObjectId
module.exports = function(req, res, next) {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new restify.InvalidArgumentError());
  }
  return next();
};