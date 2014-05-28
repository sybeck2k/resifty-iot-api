"use strict";

// HTTP Middleware to extract Prefer header according to http://tools.ietf.org/html/draft-snell-http-prefer-18
// still very primitive, to be refactored
module.exports = function(req, res, next) {
  req.prefer = {};
  if (!req.headers.prefer) {
    return next();
  }

  req.prefer.wait = req.headers.prefer.match(/wait=(\d+)/);
  if (req.prefer.wait) {
    req.prefer.wait = parseInt(req.prefer.wait[1], 10);
  }
  req.prefer.return = req.headers.prefer.match(/return=(minimal|representation)/);
  if (req.prefer.return) {
    req.prefer.return = req.prefer.return[1];
  }
  req.prefer['respond-async'] = req.headers.prefer.match(/respond-async/) ? true : null;
  
  Object.keys(req.prefer).forEach(function(k) {
    if (req.prefer[k] === null) {
      delete req.prefer[k];
    }
  });

  return next();
};