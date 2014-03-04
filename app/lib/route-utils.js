var restify         = require('restify');

/*
* A middleware to help paginate results in API GET methods
*/
exports.header_next = function(req, res, next) {
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

/*
* Middleware to Validate a mongo standard ObjectId
*/
exports.validateObjectId = function(req, res, next) {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return next(new restify.InvalidArgumentError());
  }
  return next();
};

/*
* Middleware to verify that the current client is authorized
*/
exports.validateClient = function(req, res, next) {
  if (!req.clientId) {
    return res.sendUnauthorized();
  }
  next();
};