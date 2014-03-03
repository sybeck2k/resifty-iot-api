var Logger     = require('bunyan');
var mongoose   = require('mongoose');
var fs         = require('fs');

var logger = new Logger({
    name: 'restify-iot',
    streams: [
      {
        stream: process.stdout,
        level: 'debug'
      },
      {
        path: '/tmp/restify.log',
        level: 'info'
      }
    ],
    serializers: {
      req: Logger.stdSerializers.req
    }
});


// Load configurations
var env     = process.env.NODE_ENV || 'dev';
var config  = require('./config.'+ env);
var models_path = require('path').normalize(__dirname) + '/app/models';
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

var api_server = require('./app/server')(config, logger);
