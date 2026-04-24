const YahooFinance = require('yahoo-finance2').default;

const yahoo = new YahooFinance();

async function test() {
  try {
    const res = await yahoo.quote('AAPL');
    console.log("AAPL:", res.regularMarketPrice);
  } catch(e) { console.error(e); }
}
test();
