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

module.exports = helpers;
