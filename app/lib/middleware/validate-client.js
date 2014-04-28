"use strict";

// HTTP Middleware to verify that the current client is authorized
module.exports = function(req, res, next) {
  
  if (!req.credentials) {
    return res.sendUnauthorized();
  }
  next();
};