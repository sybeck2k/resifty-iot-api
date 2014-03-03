"use strict";

/*
 * Cluster Imports
 */
var cluster    = require('cluster');
var http       = require('http');
var numCPUs    = require('os').cpus().length;
var Logger     = require('bunyan');

var logger = new Logger({
    name: 'restify-iot',
    streams: [
      {
        stream: process.stdout,
        level: 'debug'
      }
    ],
    serializers: {
      req: Logger.stdSerializers.req
    }
});

// Load configurations
var env     = process.env.NODE_ENV || 'dev';
var config  = require('./config.'+ env);

if (cluster.isMaster) {
  /*
   * Fork workers.
   */
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    logger.warn('worker ' + worker.process.pid + ' died');
  });
} else {
  /*
   * Start a new server on a new thread
   */
  require('./app/server')(config, logger);
}