var fs = require('fs');
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

var store = require('./lib/store');
var handlers = require('./lib/handlers');
var config = require('./config');

var routes = {
  'ping': handlers.ping,
  'users': handlers.users,
};

var unifiedServer = function (req, res) {
  var parsedUrl = url.parse(req.url, true);
  
  var path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');
  var method = req.method.toUpperCase();
  var query = parsedUrl.query;

  var decoder = new StringDecoder('utf8');
  var buffer = '';
  req.on('data', function(data) {

    buffer += decoder.write(data);
  });
  req.on('end', function () {
    buffer += decoder.end();

    var handler = routes[path] || handlers.notFound;
    
    handler({ path: path, method: method, query: query, payload: JSON.parse(buffer)}, function (statusCode, payload) {
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
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem'),
};
var httpsserver = https.createServer(httpsOptions, unifiedServer);

httpserver.listen(config.port, function() {
  console.log(`http server is listening on port ${config.port} in ${config.name} mode`);
});

httpsserver.listen(config.port + 1, function() {
  console.log(`https server is listening on port ${config.port + 1} in ${config.name} mode`);
});

//openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
