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
    driver: './lib/sensor-storage/influxdb',
    host: "localhost",
    port: "8086",
    username: "root",
    password: "root",
    database: "test"
  },
  pubsub_server: {
    driver: './lib/pubsub-server/mqtt_server',
    redis_host: "localhost",
    redis_port: "6379",
    port: "1885"
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