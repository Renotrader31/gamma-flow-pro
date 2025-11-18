#!/usr/bin/env node
/**
 * Test your Polygon.io API key
 * Usage: node test-api-key.js YOUR_API_KEY
 */

const apiKey = process.argv[2] || process.env.POLYGON_API_KEY

if (!apiKey) {
  console.error('❌ Error: No API key provided')
  console.log('\nUsage:')
  console.log('  node test-api-key.js YOUR_API_KEY')
  console.log('  OR set POLYGON_API_KEY in .env.local and run: node test-api-key.js')
  process.exit(1)
}

console.log('🔍 Testing Polygon.io API key...\n')

// Test 1: Basic snapshot
const testSnapshot = async () => {
  console.log('Test 1: Fetching market snapshot...')
  try {
    const response = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?limit=5&apiKey=${apiKey}`
    )

    if (!response.ok) {
      console.log(`❌ Failed: HTTP ${response.status}`)
      if (response.status === 401 || response.status === 403) {
        console.log('   → Invalid API key or insufficient permissions')
      }
      return false
    }

    const data = await response.json()
    if (data.tickers && data.tickers.length > 0) {
      console.log(`✅ Success: Got ${data.tickers.length} stocks`)
      console.log(`   First stock: ${data.tickers[0].ticker} @ $${data.tickers[0].day?.c || 'N/A'}`)
      return true
    } else {
      console.log('❌ No data returned')
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

// Test 2: Options snapshot
const testOptions = async () => {
  console.log('\nTest 2: Fetching options data for SPY...')
  try {
    const response = await fetch(
      `https://api.polygon.io/v3/snapshot/options/SPY?apiKey=${apiKey}`
    )

    if (!response.ok) {
      console.log(`❌ Failed: HTTP ${response.status}`)
      if (response.status === 401 || response.status === 403) {
        console.log('   → Your plan may not include options data')
      }
      return false
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      console.log(`✅ Success: Got ${data.results.length} options`)
      return true
    } else {
      console.log('⚠️  No options data (may require paid plan)')
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

// Test 3: Historical bars (for liquidity hunter)
const testBars = async () => {
  console.log('\nTest 3: Fetching 5-minute bars for NVDA...')
  try {
    const to = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromDate = from.toISOString().split('T')[0]
    const toDate = to.toISOString().split('T')[0]

    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/NVDA/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${apiKey}`
    )

    if (!response.ok) {
      console.log(`❌ Failed: HTTP ${response.status}`)
      return false
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      console.log(`✅ Success: Got ${data.results.length} bars`)
      console.log(`   Latest bar: $${data.results[data.results.length - 1].c}`)
      return true
    } else {
      console.log('❌ No bar data returned')
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return false
  }
}

// Run all tests
;(async () => {
  const test1 = await testSnapshot()
  const test2 = await testOptions()
  const test3 = await testBars()

  console.log('\n' + '='.repeat(50))
  console.log('RESULTS:')
  console.log('='.repeat(50))
  console.log(`Market Snapshot: ${test1 ? '✅' : '❌'}`)
  console.log(`Options Data:    ${test2 ? '✅' : '⚠️ (may need paid plan)'}`)
  console.log(`Historical Bars: ${test3 ? '✅' : '❌'}`)

  if (test1 && test3) {
    console.log('\n🎉 Your API key is working! Your watchlist will show live data.')
  } else if (test1) {
    console.log('\n⚠️  Your API key works but may have limitations.')
    console.log('   You\'ll get stock prices but may need a paid plan for full features.')
  } else {
    console.log('\n❌ Your API key is not working properly.')
    console.log('   Please check your key at https://polygon.io/dashboard')
  }

  console.log('\n💡 Next step: Add this key to Vercel environment variables')
})()
