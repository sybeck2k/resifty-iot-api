var fs         = require('fs');
var mongoose   = require('mongoose');
var config     = require('../config.test');
var Logger     = require('bunyan');
var path       = require('path');

var srcDir = path.join(__dirname, '..', 'app');

var logger = new Logger({
    name: 'restify-iot-test',
    streams: [
      {
        stream: process.stderr,
        level: 'error'
      }
    ],
    serializers: {
      req: Logger.stdSerializers.req
    }
});

var models_path = require('path').normalize(__dirname) + '/../app/models';
var db = mongoose.connection;

// Connect to MongoDB
mongoose.connect(config.db_url);

db.on('error', logger.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  logger.debug("Database connection opened.");
});

// Bootstrap models
fs.readdirSync(models_path).forEach(function (file) {
  logger.debug("Loading model " + file);
  require(models_path + '/' +file);
});

require('blanket')({
  // Only files that match the pattern will be instrumented
  pattern: srcDir
});