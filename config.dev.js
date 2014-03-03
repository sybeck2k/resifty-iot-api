/**
 * Environment dependent configuration properties
 */
module.exports = {
  root: require('path').normalize(__dirname),
  app: {
    name: 'iot-api'
  },
  host: 'localhost',
  port: '9090',
  db_url: 'mongodb://localhost:27017/restify_test',
  influx_db: {
    host: "localhost",
    port: "8086",
    username: "root",
    password: "root",
    database: "test"
  },
  pagination: {
    max_results: 100,
    results_per_page: 20
  },
  redis_url: null,
  session_timeout: 20 * 60 * 10, // defaults to 20 minutes, in ms (20 * 60 * 1000)
  socket_loglevel: '1', // 0 - error, 1 - warn, 2 - info, 3 - debug
  version: '1.0.0'
};