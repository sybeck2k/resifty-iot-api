var mongoose        = require('mongoose');
var restify         = require('restify');
var User            = mongoose.model('User');

function validateUser(req, res) {
    req.log.info(req);
    if (!req.username) {
        return res.sendUnauthorized();
    }
}

module.exports = function (server, config) {
    server.pre(function(req, res, next) {
        if (req.url === '/') {
            
        }
        else if (req.url === '/public') {
            
        }
        else if (req.url === '/token') {
            return next();
        }
        req.headers.accept = 'application/json';
        return next();
    });

    // Define entry points
    var RESOURCES = Object.freeze({
        INITIAL     : "/",
        TOKEN       : "/token",
        PUBLIC      : "/public",
        SECRET      : "/secret"
    });

    server.get(RESOURCES.PUBLIC, function (req, res) {
        res.send({
            "public resource": "is public",
            "it's not even": "a linked HAL resource",
            "just plain": "application/json",
            "personalized message": req.username ? "hi, " + req.username + "!" : "hello stranger!"
        });
    });

    server.get(RESOURCES.SECRET, function (req, res) {
        validateUser(req, res);
        res.send({'message':'Success'});
    });
}