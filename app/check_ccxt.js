const ccxt = require('ccxt');
console.log('coindcx in ccxt:', 'coindcx' in ccxt);
console.log('coindcx type:', typeof ccxt.coindcx);
console.log('coinswitchpro in ccxt:', 'coinswitchpro' in ccxt);
console.log('coinswitchpro type:', typeof ccxt.coinswitchpro);
console.log('coindcx in ccxt.pro:', ccxt.pro && 'coindcx' in ccxt.pro);
console.log(ccxt.exchanges.filter(e => e.includes('coin')));
