/**
 * Environment dependent configuration properties
 */
module.exports = {
  app: {
    name: 'iot-api'
  },
  host: 'localhost',
  port: '9095',
  db_url: 'mongodb://localhost:27017/restify_test',
  sensor_storage: {
    driver: 'memory'
  },
  pubsub_server: {
    driver: 'faye_server',
  },
  pagination: {
    max_results: 100,
    results_per_page: 20
  },
  redis_url: 'http://localhost:6379/',
  version: '1.0.0'
};