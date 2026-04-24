const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/ccxt/ccxt/master/js/src/coindcx.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('app/ccxt_coindcx.js', data);
    console.log('done');
  });
});
