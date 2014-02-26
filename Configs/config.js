/**
 * Environment dependent configuration properties
 */
module.exports = {
    development: {
        root: require('path').normalize(__dirname + '/..'),
        app: {
            name: 'restify-oauth2-mongoDB'
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
        mailSettings : {
            mailFrom: 'test@gmail.com',
            mailService: "Gmail",
            mailAuth: {user: "test@gmail.com", pass: "testpass"},
            sendEmail: false,
            browserPreview: true
        },
        version: '1.0.0'
    },
    test: {

    }, 
    production: {

    }
}