"use strict";

var mongoose = require('mongoose');

/**
 * @method paginate
 * @param {Object} query Mongoose Query Object
 * @param {Object} populate Mongoose Populate Object
 * @param {Number} pageNumber 
 * @param {Number} resultsPerPage
 * Extend Mongoose Models to paginate queries
 **/
module.exports = function(q, pageNumber, resultsPerPage, callback, options) {
  options = options || {};
  callback = callback || function(){};

  var model = this,
      columns = options.columns || null,
      populate = options.populate || null,
      sortBy = options.sortBy || {_id:1},
      skipFrom = (pageNumber * resultsPerPage) - resultsPerPage,
      query;

  query = model.find(q);
  if(columns !== null){
    query = query.select(options.columns);
  }
  if(populate !== null){
    query = query.populate(options.populate);
  }

  query = query.skip(skipFrom).limit(resultsPerPage).sort(sortBy);
  query.exec(function(error, results) {
    if (error) {
      callback(error, null, null);
    } else {
      model.count(q, function(error, count) {
        if (error) {
          callback(error, null, null);
        } else {
          var pageCount = Math.ceil(count / resultsPerPage);
          if (pageCount === 0) {
            pageCount = 1;
          }
          callback(null, pageCount, results);
        }
      });
    }
  });
};
