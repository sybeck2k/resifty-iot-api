/**
 * @list dependencies
 **/

var mongoose = require('mongoose');

/**
 * @method paginate
 * @param {Object} query Mongoose Query Object
 * @param {Number} pageNumber 
 * @param {Number} resultsPerPage
 * Extend Mongoose Models to paginate queries
 **/

module.exports = function(q, pageNumber, resultsPerPage, callback, options) {
  var model = this,
      columns = options.columns || null,
      sortBy = options.sortBy || {_id:1},
      skipFrom = (pageNumber * resultsPerPage) - resultsPerPage,
      query;

  options = options || {};
  callback = callback || function(){};


  if(columns == null){
    query = model.find(q).skip(skipFrom).limit(resultsPerPage).sort(sortBy);
  }else{
    query = model.find(q).select(options.columns).skip(skipFrom).limit(resultsPerPage).sort(sortBy);
  }

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
