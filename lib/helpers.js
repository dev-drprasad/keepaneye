var crypto = require('crypto');

var helpers = {};

helpers.hash = function(str) {
 return crypto.createHmac('sha256', 'AXCXA').update(str).digest('hex');  
}

module.exports = helpers;
