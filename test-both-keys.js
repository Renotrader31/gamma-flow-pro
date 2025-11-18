#!/usr/bin/env node
/**
 * Test both Polygon and FMP API keys
 */

const POLYGON_KEY = '75rlu6cWGNnIqqR_x8M384YUjBgGk6kT'
const FMP_KEY = 'm2XfxOS0sZxs6hLEY5yRzUgDyp5Dur4V'

console.log('🔍 Testing API Keys...\n')

// Test Polygon
async function testPolygon() {
  console.log('=' .repeat(60))
  console.log('POLYGON.IO TEST')
  console.log('=' .repeat(60))

  const tests = [
    {
      name: 'Market Status',
      url: `https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_KEY}`
    },
    {
      name: 'AAPL Quote',
      url: `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${POLYGON_KEY}`
    },
    {
      name: 'Market Snapshot (5 stocks)',
      url: `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?limit=5&apiKey=${POLYGON_KEY}`
    }
  ]

  for (const test of tests) {
    console.log(`\n📊 ${test.name}...`)
    try {
      const response = await fetch(test.url)
      const status = response.status
      const statusText = response.statusText

      console.log(`   Status: ${status} ${statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ Success!`)
        console.log(`   Response:`, JSON.stringify(data).substring(0, 200) + '...')
      } else {
        const text = await response.text()
        console.log(`   ❌ Failed: ${text.substring(0, 200)}`)

        if (status === 401 || status === 403) {
          console.log(`   → Invalid API key or insufficient permissions`)
        } else if (status === 429) {
          console.log(`   → Rate limit exceeded`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
}

// Test FMP
async function testFMP() {
  console.log('\n' + '=' .repeat(60))
  console.log('FINANCIAL MODELING PREP TEST')
  console.log('=' .repeat(60))

  const tests = [
    {
      name: 'AAPL Quote',
      url: `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${FMP_KEY}`
    },
    {
      name: 'Most Active Stocks',
      url: `https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${FMP_KEY}`
    },
    {
      name: 'Intraday 5min bars (AAPL)',
      url: `https://financialmodelingprep.com/api/v3/historical-chart/5min/AAPL?apikey=${FMP_KEY}`
    }
  ]

  for (const test of tests) {
    console.log(`\n📊 ${test.name}...`)
    try {
      const response = await fetch(test.url)
      const status = response.status
      const statusText = response.statusText

      console.log(`   Status: ${status} ${statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ Success!`)
        if (Array.isArray(data)) {
          console.log(`   Got ${data.length} items`)
          if (data.length > 0) {
            console.log(`   First item:`, JSON.stringify(data[0]).substring(0, 150) + '...')
          }
        } else {
          console.log(`   Response:`, JSON.stringify(data).substring(0, 200) + '...')
        }
      } else {
        const text = await response.text()
        console.log(`   ❌ Failed: ${text.substring(0, 200)}`)

        if (status === 401 || status === 403) {
          console.log(`   → Invalid API key or insufficient permissions`)
        } else if (status === 429) {
          console.log(`   → Rate limit exceeded`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
}

// Run tests
(async () => {
  await testPolygon()
  await testFMP()

  console.log('\n' + '=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  console.log('\n💡 If both APIs show "Access denied":')
  console.log('   1. Check if keys need activation in your dashboard')
  console.log('   2. Verify keys are copied correctly (no extra spaces)')
  console.log('   3. Check for IP whitelist restrictions')
  console.log('   4. Confirm your subscription is active')
  console.log('\n💡 Next step: Add working key to Vercel environment variables')
  console.log('   https://vercel.com/dashboard → your project → Settings → Environment Variables')
})()
