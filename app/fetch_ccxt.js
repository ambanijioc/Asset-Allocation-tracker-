const https = require('https');
https.get('https://raw.githubusercontent.com/ccxt/ccxt/master/js/src/coinswitch.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
