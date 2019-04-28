var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

var store = require('./store');
var handlers = require('./handlers');
var helpers = require('./helpers');
var config = require('../config');

var routes = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
};

var unifiedServer = function (req, res) {
  var parsedUrl = url.parse(req.url, true);
  
  var path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
  var method = req.method.toLowerCase();
  var query = parsedUrl.query;

  var decoder = new StringDecoder('utf8');
  var buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function () {
    buffer += decoder.end();

    var handler = handlers.notFound;
    var routePaths = Object.keys(routes);
    for (var i = 0; i < routePaths.length; i++) {
      var route = routePaths[i];
      if (path.startsWith(route)) {
        handler = routes[route];
        break;
      }
    }
    
    handler({ headers: req.headers, path: path, method: method, query: query, payload: helpers.parseJSON(buffer)}, function (statusCode, payload) {
      res.statusCode = statusCode || 200;
      if (typeof(payload) === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      } else {
        res.end(payload || null);
      }
    });
  });
}

var httpserver = http.createServer(unifiedServer);
var httpsOptions = {
  key: fs.readFileSync(path.join(process.cwd(), 'certs/key.pem')),
  cert: fs.readFileSync(path.join(process.cwd(), 'certs/cert.pem')),
};
var httpsserver = https.createServer(httpsOptions, unifiedServer);

module.exports.init = function() {
  httpserver.listen(config.port, function() {
    console.log(`http server is listening on port ${config.port} in ${config.name} mode`);
  });
  
  httpsserver.listen(config.port + 1, function() {
    console.log(`https server is listening on port ${config.port + 1} in ${config.name} mode`);
  });
}


//openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
