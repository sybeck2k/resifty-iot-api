"use strict";

var restify           = require("restify");
var url               = require("url");

// Extracts the pagination information from the request and injects the parsed and normalized parameters:
// page, results_per_page into the req object
module.exports = function(config) {
  return function (req, res, next) {
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
  };
};