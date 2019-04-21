var crypto = require('crypto');

var helpers = {};

helpers.hash = function(str) {
 return crypto.createHmac('sha256', 'AXCXA').update(str).digest('hex');  
}

helpers.parseJSON = function(str) {
  if (!str) return null;

  try {
    return JSON.parse(str);
  } catch (err) {
    console.log('err :', err);
    return null;
  }
}

helpers.createRandomString = function(len) {
  var isLengthValid = typeof len === 'number' && len > 0;
  if (!isLengthValid) throw Error('Expected `len` of type number and greater than zero');

  var possibleChars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }).map(() => possibleChars[Math.round(Math.random() * possibleChars.length - 1)]).join('');
}

module.exports = helpers;
