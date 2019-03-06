var store = require('./store');
var helpers = require('./helpers'); 

var handlers = {};
handlers.ping = function (req, callback) {
  callback(200, { ping: 'pong'});
}

handlers.notFound = function (req, callback) {
  callback(404)
}

handlers.users = function(req, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method.toLowerCase())) {
    callback(405);
    return;
  }

  handlers._users[req.method.toLowerCase()](req, callback);
}

handlers._users = {};

handlers._users.get = function (req, callback) {

}

handlers._users.post = function (req, callback) {
  var payload = req.payload;
  var firstName = typeof(payload.firstName === 'string') && payload.firstName.trim().length > 0 ? payload.firstName : null;
  var lastName = typeof(payload.lastName === 'string') && payload.lastName.trim().length > 0 ? payload.lastName : null;
  var password = typeof(payload.password === 'string') && payload.password.trim().length > 0 ? payload.password : null;
  var phoneNumber = typeof(payload.phoneNumber === 'string') && payload.phoneNumber.trim().length === 10 ? payload.phoneNumber : null;
  var tosAgreed = typeof(payload.tosAgreed === 'boolean') && payload.tosAgreed;

  console.log(firstName, lastName, password, phoneNumber, tosAgreed);

  if (!(firstName && lastName && phoneNumber && password && tosAgreed)) {
    return callback(400, { error: 'Missing required fields' });
  }

  store.read(`users/${phoneNumber}`, function(error, data) {
    if (data && !error) {
      return callback(400, { error: 'User with phone already exists' });
    }

    var hashedPassword = helpers.hash(password);

    var user = {
      firstName: firstName,
      lastName: lastName,
      password: hashedPassword,
      phoneNumber: phoneNumber,
      tosAgreed: tosAgreed,
    };

    store.create(`users/${phoneNumber}`, user, function(error) {
      if (error) {
        return callback(500, { error: 'Failed to create user' });
      }
      callback(200);
    })

  });


}

handlers._users.put = function (req, callback) {

}

handlers._users.delete = function (req, callback) {

}

module.exports = handlers;
