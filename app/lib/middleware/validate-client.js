"use strict";

// HTTP Middleware to verify that the current client is authorized
module.exports = function(req, res, next) {
  if (!req.client_data) {
    return res.sendUnauthorized();
  }
  next();
};