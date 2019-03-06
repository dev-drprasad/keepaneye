var fs = require('fs');
var path = require('path');

var appDir = process.cwd();
var dataDir = '.data';

var lib = {};

lib.create = function(filename, object, errback) {
  fs.writeFile(path.join(appDir, dataDir, filename), JSON.stringify(object), { flag: 'wx' }, errback);
}

lib.read = function(filename, callback) {
  fs.readFile(path.join(appDir, dataDir, filename), 'utf8', callback);
}

lib.update = function(filename, object, errback) {
  fs.writeFile(path.join(appDir, dataDir, filename), JSON.stringify(object), { flag: 'r+' }, errback);
}

lib.delete = function(filename, errback) {
  fs.unlink(path.join(appDir, dataDir, filename), errback);
}

module.exports = lib;
