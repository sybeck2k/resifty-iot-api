var Logger     = require('bunyan');
var api_server = require('./app/server');

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

api_server.start(config, logger);