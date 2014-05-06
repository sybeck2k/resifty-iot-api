"use strict";

var restify = require("restify");

// Paginate results in API GET methods
// requires that req.resource_base_url (the base address of the request), 
// req.page_count (the total page count) and req.page (the current page) are set
module.exports = function(req, res, next) {
  if (!req.resource_base_url || !req.page_count || !req.page || !req.results_per_page) {
    req.log.error("Missing mandatory parameters {resource_base_url,page_count,page}");
    return next(new restify.InternalError());
  }

  var header_link = "",
      fullURL = (req.isSecure() ? 'https':'http') + "://" + req.header('host') +
      req.resource_base_url +
      '?per_page=' + req.results_per_page;

  header_link += '<' + fullURL + '&page=1>; rel="first"';
  header_link += ',<' + fullURL + '&page='+ req.page_count +'>; rel="last"';

  if (req.page_count > req.page) {
    header_link += ',<' + fullURL + '&page='+ (req.page +1) + '>; rel="next"';
  }
  if (req.page_count > 1) {
    header_link += ',<' + fullURL + '&page='+ (req.page -1) +'>; rel="prev"';
  }
  
  res.setHeader('Link', header_link);
  res.send(req.resources);
};
