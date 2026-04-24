const crypto = require('crypto');
const apiKey = process.env.COINDCX_API_KEY || '';
const secret = process.env.COINDCX_SECRET || '';

async function test() {
  const timeStamp = Math.floor(Date.now());
  const body = { timestamp: timeStamp };
  const payload = JSON.stringify(body);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  console.log('Sending payload:', payload);
  const balanceRes = await fetch('https://api.coindcx.com/exchange/v1/users/balances', {
    method: 'POST',
    headers: {
      'X-AUTH-APIKEY': apiKey,
      'X-AUTH-SIGNATURE': signature,
      'Content-Type': 'application/json',
    },
    body: payload
  });
  
  console.log('Status:', balanceRes.status, balanceRes.statusText);
  const text = await balanceRes.text();
  console.log('Response:', text);
}
test();
