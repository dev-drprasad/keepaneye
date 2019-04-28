var crypto = require('crypto');
const https = require('https');
const qs = require('querystring');

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


helpers.isValidUrl = function(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;  
  }
}

helpers.Mailgun = function(path, token) {
  var options = {
    hostname: 'api.mailgun.net',
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    auth: 'api:' + token,
  }

  const req = https.request(options, (res) => {
    let result = '';
    res.on("data", (b) => result += b.toString());
    res.on('end', () => console.log('result :', result));
  });

  req.on('error', (err) => console.log('err :', err));

  function sendEmail(from, to, subject, message) {
    const payload = qs.stringify({
      from: from,
      to: to,
      subject: subject,
      text: message,
    });

    req.write(payload)
    req.end();
  }

  return {
    sendEmail: sendEmail,
  }

}

module.exports = helpers;
