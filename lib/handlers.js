var store = require('./store');
var helpers = require('./helpers');

var handlers = {};

handlers.ping = function (req, callback) {
  callback(200, { ping: 'pong'});
}

handlers.notFound = function (req, callback) {
  callback(404);
}

handlers.users = function(req, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    callback(405);
    return;
  }

  handlers._users[req.method](req, callback);
}

handlers._users = {};

handlers._users.get = function (req, callback) {
  var phoneNumberMatch = req.path.match(/users\/(?<phoneNumber>\d+)/);
  if (!phoneNumberMatch) return callback(400, { error: 'Missing phoneNumber in path name'});

  var phoneNumber = phoneNumberMatch.groups.phoneNumber;

  store.read(`users/${phoneNumber}`, function(err, data) {
    if (err) return callback(404, { error: 'User does not exist with given phoneNumber'});

    delete data.password;
    return callback(200, data);
  })

}

handlers._users.post = function (req, callback) {
  var payload = req.payload;
  
  var isFirstNameValid = typeof payload.firstName === 'string';
  var isLastNameValid= typeof payload.lastName === 'string';
  var isPasswordValid= typeof payload.password === 'string' ;
  var isPhoneNumbValider = typeof payload.phoneNumber === 'string' && payload.phoneNumber.trim().length === 10;
  var isTOSAgreedValid = typeof payload.tosAgreed === 'boolean';


  if (!(isFirstNameValid && isLastNameValid && isPasswordValid && isPhoneNumbValider && isTOSAgreedValid)) {
    return callback(400, { error: 'fields types not matched'})
  }

  if (!(payload.firstName && payload.lastName && payload.phoneNumber && payload.password && payload.tosAgreed)) {
    return callback(400, { error: 'Missing required fields' });
  }

  store.read(`users/${payload.phoneNumber}`, function(error, data) {
    if (data && !error) {
      return callback(400, { error: 'User with phone already exists' });
    }

    var hashedPassword = helpers.hash(payload.password);
    if (!hashedPassword) {
      return callback(500, { error: 'Couldnot hash user\'s password'})
    }

    var user = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      password: hashedPassword,
      phoneNumber: payload.phoneNumber.trim(),
      tosAgreed: payload.tosAgreed,
    };

    store.create(`users/${payload.phoneNumber}`, user, function(error) {
      if (error) {
        return callback(500, { error: 'Failed to create user' });
      }
      callback(200);
    })
  });
}

handlers._users.put = function (req, callback) {
  var phoneNumberMatch = req.path.match(/users\/(?<phoneNumber>\d+)/);
  if (!phoneNumberMatch) return callback(400, { error: 'Missing phoneNumber in path name'});

  var phoneNumber = phoneNumberMatch.groups.phoneNumber;
  
  var isPhoneNumberValid = typeof phoneNumber === 'string' && phoneNumber.trim().length === 10;
  if (!isPhoneNumberValid) return callback(400, { error: 'phoneNumber is invalid'});
  
  var payload = req.payload;
  var fieldsThatCanUpdate = [
    {name: 'firstName', validate: function(firstName){ return typeof firstName === 'string' }},
    {name: 'lastName', validate: function(lastName){ return typeof lastName === 'string' }},
    {name: 'password', validate: function(password){ return typeof password === 'string' }},
    {name: 'phoneNumber', validate: function(phoneNumber) { return typeof phoneNumber === 'string' && phoneNumber.trim().length === 10 }}
  ];

  for (var i = 0; i < fieldsThatCanUpdate.length; i++) {
    var field = fieldsThatCanUpdate[i];
    if (payload[field.name]) {
      if (!field.validate(payload[field.name])) return callback(400, { error: `field ${field.name} is invalid`});
    }
  }

  store.read(`users/${phoneNumber}`, function(err, data) {
    if (err || !data) return callback(404, { error: 'User doesnot exist'});

    Object.keys(payload).forEach(function(field) {
      if (field === 'password') {
        data.password = helpers.hash(payload.password);
      } else {
        data[field] = payload[field];
      }
    });

    store.update(`users/${phoneNumber}`, data, function(err) {
      if (err) return callback(500, { error: 'Internal server error '});
      
      return callback(200, data);
    });
  });
}

handlers._users.delete = function (req, callback) {
  var phoneNumberMatch = req.path.match(/users\/(?<phoneNumber>\d+)/);
  if (!phoneNumberMatch) return callback(400, { error: 'Missing phoneNumber in path name'});

  var phoneNumber = phoneNumberMatch.groups.phoneNumber;
  
  var isPhoneNumberValid = typeof phoneNumber === 'string' && phoneNumber.trim().length === 10;
  if (!isPhoneNumberValid) return callback(400, { error: 'phoneNumber is invalid'});

  store.read(`users/${phoneNumber}`, function(err, data) {
    if (err || !data) return callback(404, { error: 'User doesnot exist' });
    
    store.delete(`users/${phoneNumber}`, function(err) {
      if (err) return callback(500, { error: 'Could not delete user' });

      return callback(200);
    });
  });
}

module.exports = handlers;
