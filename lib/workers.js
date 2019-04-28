var https = require('https');
var store = require('./store');

var workers = {};

var checkStatus = function(url, method, timeout) {
  var URLObject = new URL(url);
  var options = {
    host: URLObject.host,
    path: URLObject.pathname,
    method: method,
    timeout: timeout,
  };

  const req = https.request(options, (res) => {
    console.log('res.statusCode :', url, res.statusCode);
  });

  req.on('error', (err) => console.log('err :', err));
  req.end();
}

workers.init = function() {
  store.getAll('checks', function(err, checks) {
    if (err) console.error('Could not get list of checks', err);

    checks.forEach(function(check) {
      checkStatus(check.url, check.method, check.timeout);
    });
  });
}

module.exports = workers;
