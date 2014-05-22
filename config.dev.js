/**
 * Environment dependent configuration properties
 */
module.exports = {
  app: {
    name: 'iot-api'
  },
  host: 'localhost',
  port: '9090',
  db_url: 'mongodb://localhost:27017/restify_dev',
  sensor_storage: {
    driver: 'influxdb',
    host: "localhost",
    port: "8086",
    username: "root",
    password: "root",
    database: "test"
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