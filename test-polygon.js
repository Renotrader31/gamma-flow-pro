/**
 * Test Script: Verify Polygon API Integration
 * Run this to check if real data is being fetched
 */

const POLYGON_API_KEY = '75rlu6cWGNnIqqR_x8M384YUjBgGk6kT';

async function testPolygonAPI() {
  console.log('🧪 Testing Polygon API Integration...\n');

  // Test 1: Fetch AAPL daily data
  console.log('📊 Test 1: Fetching AAPL daily data...');
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const dailyUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(dailyUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      console.log(`✅ SUCCESS: Got ${data.results.length} daily candles for AAPL`);

      // Show last 3 candles
      const last3 = data.results.slice(-3);
      console.log('\n📈 Last 3 Daily Candles:');
      last3.forEach((candle, i) => {
        const date = new Date(candle.t).toISOString().split('T')[0];
        console.log(`  ${i + 1}. Date: ${date}, Close: $${candle.c.toFixed(2)}, Volume: ${candle.v.toLocaleString()}`);
      });
    } else {
      console.log('❌ FAILED: No data returned from Polygon');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 2: Fetch AAPL 5-minute data
  console.log('\n📊 Test 2: Fetching AAPL 5-minute data...');
  const fiveMinFrom = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fiveMinUrl = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/5/minute/${fiveMinFrom}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(fiveMinUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      console.log(`✅ SUCCESS: Got ${data.results.length} 5-minute candles for AAPL`);

      // Show last 3 candles
      const last3 = data.results.slice(-3);
      console.log('\n📈 Last 3 Five-Minute Candles:');
      last3.forEach((candle, i) => {
        const time = new Date(candle.t).toLocaleString();
        console.log(`  ${i + 1}. Time: ${time}, Close: $${candle.c.toFixed(2)}, Volume: ${candle.v.toLocaleString()}`);
      });
    } else {
      console.log('❌ FAILED: No data returned from Polygon');
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  // Test 3: Check BFCI components
  console.log('\n📊 Test 3: Checking BFCI components (SPY, VIX)...');

  const spyUrl = `https://api.polygon.io/v2/aggs/ticker/SPY/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=10&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(spyUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      console.log(`✅ SUCCESS: Got ${data.results.length} daily candles for SPY`);
      const latest = data.results[data.results.length - 1];
      const date = new Date(latest.t).toISOString().split('T')[0];
      console.log(`   Latest SPY: Date: ${date}, Close: $${latest.c.toFixed(2)}`);
    } else {
      console.log('❌ FAILED: No SPY data');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n✅ Test Complete!\n');
  console.log('💡 What to check:');
  console.log('   - Does the latest price match your chart?');
  console.log('   - Are the dates/times current?');
  console.log('   - If data looks good, the issue may be in indicator calculations\n');
}

// Run the test
testPolygonAPI();
