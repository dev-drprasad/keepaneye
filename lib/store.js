var fs =  require('fs');
var path = require('path');
var helpers = require('./helpers');

var appDir = process.cwd();
var dataDir = '.data';

var lib = {};

lib.create = function(filename, object, errback) {
  fs.writeFile(path.join(appDir, dataDir, filename), JSON.stringify(object), { flag: 'wx' }, errback);
}

lib.read = function(filename, callback) {
  fs.readFile(path.join(appDir, dataDir, filename), 'utf8', function(err, data) {
    callback(err, helpers.parseJSON(data));
  });
}

lib.update = function(filename, object, errback) {
  fs.writeFile(path.join(appDir, dataDir, filename), JSON.stringify(object), { flag: 'r+' }, errback);
}

lib.delete = function(filename, errback) {
  fs.unlink(path.join(appDir, dataDir, filename), errback);
}

lib.getAll = function(entity, callback) {
  fs.readdir(path.join(appDir, dataDir, entity), function(err, filenames) {
    if (err) return callback(err, []);

    var items = [];

    for (let i = 0; i < filenames.length; i++) {
      var filename = filenames[i];
      try {
        var content = fs.readFileSync(path.join(appDir, dataDir, path.join(entity, filename)), 'utf8');
        var parsed = helpers.parseJSON(content);

        if (parsed) items.push(parsed)
      } catch (err) {
        return callback(err, []);
      }
    }
    callback(null, items);
  });
}

module.exports = lib;
