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

  var tokenId = req.headers.token;
  handlers._tokens._verifyToken(tokenId, phoneNumber, function(isTokenValid) {
    if (!isTokenValid) return callback(403, { error: 'Not authenticated' });

    store.read(`users/${phoneNumber}`, function(err, data) {
      if (err) return callback(404, { error: 'User does not exist with given phoneNumber'});
  
      delete data.password;
      return callback(200, data);
    });
  });

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

  var tokenId = req.headers.token;
  handlers._tokens._verifyToken(tokenId, phoneNumber, function(isTokenValid) {
    if (!isTokenValid) return callback(403, { error: 'Not authenticated' });

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
  });
}

handlers._users.delete = function (req, callback) {
  var phoneNumberMatch = req.path.match(/users\/(?<phoneNumber>\d+)/);
  if (!phoneNumberMatch) return callback(400, { error: 'Missing phoneNumber in path name'});

  var phoneNumber = phoneNumberMatch.groups.phoneNumber;
  
  var isPhoneNumberValid = typeof phoneNumber === 'string' && phoneNumber.trim().length === 10;
  if (!isPhoneNumberValid) return callback(400, { error: 'phoneNumber is invalid'});

  var tokenId = req.headers.token;
  handlers._tokens._verifyToken(tokenId, phoneNumber, function(isTokenValid) {
    if (!isTokenValid) return callback(403, { error: 'Not authenticated' });

    store.read(`users/${phoneNumber}`, function(err, user) {
      if (err || !user) return callback(404, { error: 'User doesnot exist' });
      
      store.delete(`users/${phoneNumber}`, function(err) {
        if (err) return callback(500, { error: 'Could not delete user' });

        (user.checks || []).forEach(function(checkId) {
          store.delete(`checks/${checkId}`, function() {
            
          });
        });
  
        return callback(200);
      });
    });
  });

}

handlers.tokens = function(req, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    callback(405);
    return;
  }

  handlers._tokens[req.method](req, callback);
}

handlers._tokens = {};

handlers._tokens.post = function(req, callback) {
  var payload = req.payload;
  
  if (!(payload.phoneNumber && payload.password)) {
    return callback(400, { error: 'Missing required field(s)' });
  }

  var isPasswordValid= typeof payload.password === 'string' ;
  var isPhoneNumberValid = typeof payload.phoneNumber === 'string' && payload.phoneNumber.trim().length === 10;

  if (!(isPasswordValid && isPhoneNumberValid)) {
    return callback(400, { error: 'fields types not matched'})
  }


  store.read(`users/${payload.phoneNumber}`, function(error, data) {
    if (!data || error) {
      return callback(400, { error: 'User doesnot exists with given phoneNumber' });
    }

    var hashedPassword = helpers.hash(payload.password);
    if (hashedPassword !== data.password) {
      return callback(400, { error: 'Password is wrong'})
    }

    var tokenId = helpers.createRandomString(20);
    var expiresOn = Date.now() + 1 * 60 * 60 * 1000;
    var tokenObject = {
      phoneNumber: payload.phoneNumber,
      tokenId: tokenId,
      expiresOn: expiresOn,
    };

    store.create(`tokens/${tokenId}`, tokenObject, function(error) {
      if (error) {
        return callback(500, { error: 'Failed to create token' });
      }
      delete tokenObject.phoneNumber;
      callback(200, tokenObject);
    })
  });
}

handlers._tokens.get = function(req, callback) {
  var tokenIdMatch = req.path.match(/tokens\/(?<tokenId>\w+)/);
  if (!tokenIdMatch) return callback(400, { error: 'Missing tokenId in path name'});

  var tokenId = tokenIdMatch.groups.tokenId;

  store.read(`tokens/${tokenId}`, function(err, data) {
    if (err || !data) return callback(404, { error: 'Token does not exist with given id'});

    delete data.phoneNumber;
    return callback(200, data);
  });
}

handlers._tokens.put = function(req, callback) {
  var payload = req.payload;
  
  if (!(payload.tokenId && payload.extend)) {
    return callback(400, { error: 'Missing required field(s)' });
  }

  var isExtendValid= typeof payload.password === 'boolean' ;
  var isTokenIdValid = typeof payload.tokenId === 'string' && payload.tokenId.trim().length === 20;

  if (!(isExtendValid && isTokenIdValid)) {
    return callback(400, { error: 'fields types not matched'})
  }

  store.read(`tokens/${payload.tokenId}`, function(err, data) {
    if (err || !data) return callback(404, { error: 'Token doesnot exist'});

    if (data.expiresOn < Date.now()) return callback(400, { error: 'Token already expired'});

    data.expiresOn = Date.now() + 1 * 60 * 60 * 1000;

    store.update(`tokens/${payload.tokenId}`, data, function(err) {
      if (err) return callback(500, { error: 'Couldnot update token'});

      return callback(200);
    })
  });
}

handlers._tokens.delete = function (req, callback) {
  var tokenIdMatch = req.path.match(/tokens\/(?<tokenId>\w+)/);
  if (!tokenIdMatch) return callback(400, { error: 'Missing tokenId in path name'});

  var tokenId = tokenIdMatch.groups.tokenId;

  store.read(`tokens/${tokenId}`, function(err, data) {
    if (err || !data) return callback(404, { error: 'Token does not exist with given id'});
    
    store.delete(`tokens/${tokenId}`, function(err) {
      if (err) return callback(500, { error: 'Could not delete token' });

      return callback(200);
    });
  });
}

handlers._tokens._verifyToken = function(tokenId, phoneNumber, callback) {
  if (!tokenId || !phoneNumber) return callback(false);

  store.read(`tokens/${tokenId}`, function(err, data) {
    if (err || !data) return callback(false);

    if (data.phoneNumber !== phoneNumber || data.expiresOn < Date.now()) return callback(false);

    return callback(true);
  });
}

handlers.checks = function(req, callback) {
  var acceptableMethods = ['get', 'post', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    callback(405);
    return;
  }

  handlers._checks[req.method](req, callback);
}

handlers._checks = {};

handlers._checks.post = function(req, callback) {
  var tokenId = req.headers.token;
  store.read(`tokens/${tokenId}`,function(err, data) {
    if (err || !data) return callback(403, { error: 'Not authenticated' });

    var phoneNumber = data.phoneNumber;
    handlers._tokens._verifyToken(tokenId, phoneNumber, function(isTokenValid) {
      if (!isTokenValid) return callback(403, { error: 'Token expired' });
      
      store.read(`users/${phoneNumber}`, function(err, user) {
        if (err || !user) return callback(403);
  
        var payload = req.payload;
        
        if (!(payload.url && payload.method && payload.timeout)) {
          return callback(400, { error: 'Missing required field(s)' });
        }
      
        var isURLValid= helpers.isValidUrl(payload.url);
        var isMethodValid = ['get', 'post', 'put', 'delete', 'head'].includes(payload.method);
        var isTimeoutValid = typeof payload.timeout === 'number' && payload.timeout > 0;
        
        if (!(isURLValid && isMethodValid && isTimeoutValid)) {
          return callback(400, { error: 'fields types not matched'})
        }
  
        var checkObject = {
          id: helpers.createRandomString(20),
          userId: user.phoneNumber,
          url: payload.url,
          method: payload.method,
          timeout: payload.timeout,
        };
  
        store.create(`checks/${checkObject.id}`, checkObject, function(err) {
          if (err) return callback(500);
  
          user.checks = user.checks ? user.checks.concat(checkObject.id) : [checkObject.id];
          store.update(`users/${user.phoneNumber}`, user, function(err) {
            if (err) return callback(500);
  
            return callback(200, checkObject);
          });
        });
      });
    });
  });
}

handlers._checks.get = function(req, callback) {
  var checkIdMatch = req.path.match(/checks\/(?<checkId>[\w\d]+)/);
  if (!checkIdMatch) return callback(404);
  
  var tokenId = req.headers.token;
  store.read(`tokens/${tokenId}`,function(err, data) {
    if (err || !data) return callback(403, { error: 'Not authenticated' });

    handlers._tokens._verifyToken(tokenId, data.phoneNumber, function(isTokenValid) {
      if (!isTokenValid) return callback(403, { error: 'Token expired' });
      
      store.read(`users/${data.phoneNumber}`, function(err, user) {
        if (err || !data) return callback(403, { error: 'User not associated with given token' });
      
        var checkId = checkIdMatch.groups.checkId;
  
        store.read(`checks/${checkId}`, function(err, data) {
          if (err || !data) return callback(404);
  
          return callback(200, data);
        });
      });
    });
  });
}

handlers._checks.put = function(req, callback) {
  var checkIdMatch = req.path.match(/checks\/(?<checkId>[\w\d]+)/);
  if (!checkIdMatch) return callback(404);
  
  var tokenId = req.headers.token;
  store.read(`tokens/${tokenId}`,function(err, data) {
    if (err || !data) return callback(403, { error: 'Not authenticated' });

    handlers._tokens._verifyToken(tokenId, data.phoneNumber, function(isTokenValid) {
      if (!isTokenValid) return callback(403, { error: 'Token expired' });
      
      store.read(`users/${data.phoneNumber}`, function(err, user) {
        if (err || !data) return callback(403, { error: 'User not associated with given token' });
      
        var checkId = checkIdMatch.groups.checkId;
  
        store.read(`checks/${checkId}`, function(err, data) {
          if (err || !data) return callback(404);

          var payload = req.payload;
          var fieldsThatCanUpdate = [
            {name: 'url', validate: function(url){ return helpers.isValidUrl(url) }},
            {name: 'method', validate: function(method){ return ['get', 'post', 'put', 'delete', 'head'].includes(method) }},
            {name: 'timeout', validate: function(timeout){ return typeof payload.timeout === 'number' && payload.timeout > 0 }},
          ];
        
          for (var i = 0; i < fieldsThatCanUpdate.length; i++) {
            var field = fieldsThatCanUpdate[i];
            if (payload[field.name]) {
              if (!field.validate(payload[field.name])) return callback(400, { error: `field ${field.name} is invalid`});
            }
          }

          store.read(`checks/${checkId}`, function(err, data) {
            if (err || !data) return callback(404, { error: 'Check doesnot exist'});
        
            fieldsThatCanUpdate.forEach(function(field) {
              if (payload.hasOwnProperty(field.name)) {
                data[field.name] = payload[field.name];
              }
            });
 
            store.update(`checks/${checkId}`, data, function(err) {
              if (err) return callback(500, { error: 'Internal server error '});
              
              return callback(200, data);
            });
          });

        });
      });
    });
  });
}

handlers._checks.delete = function(req, callback) {
  var checkIdMatch = req.path.match(/checks\/(?<checkId>\w+)/);
  if (!checkIdMatch) return callback(404);

  var checkId = checkIdMatch.groups.checkId;

  var tokenId = req.headers.token;
  store.read(`tokens/${tokenId}`, function(err, data) {
    if (err || !data) return callback(403, { error: 'Token does not exist with given id'});

    handlers._tokens._verifyToken(tokenId, data.phoneNumber, function(isTokenValid) {
      if (!isTokenValid) return callback(403, { error: 'Token expired' });

      store.read(`checks/${checkId}`, function(err, data) {
        if (err || !data) return callback(404);
        
        store.delete(`checks/${checkId}`, function(err) {
          if (err) return callback(500, { error: 'Could not delete check' });
  
          store.read(`users/${data.phoneNumber}`, function(err, user) {
            if (err || !user) return callback(200);
  
            if (user.checks) user.checks = user.checks.filter(function(id) { return id !== checkId });
            store.update(`users/${data.phoneNumber}`, user, function(err) {
              if (err) return callback(500, { error: 'Could not update user' });
  
              return callback(200);
            });
          });
        });
      });

    });
    
  });
}

module.exports = handlers;
