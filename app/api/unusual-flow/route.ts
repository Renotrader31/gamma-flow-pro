import { NextResponse } from 'next/server'

/**
 * Fetch real unusual options flow from Unusual Whales API
 * Tracks large premium orders and directional flow
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const apiKey = process.env.UNUSUAL_WHALES_KEY

  if (!apiKey) {
    return NextResponse.json({
      status: 'demo',
      data: getDemoFlowData(symbol),
      message: 'Using demo data - set UNUSUAL_WHALES_KEY for real data'
    })
  }

  // If no symbol, fetch market-wide flow
  const endpoint = symbol
    ? `https://api.unusualwhales.com/api/stock/${symbol}/flow`
    : 'https://api.unusualwhales.com/api/option-trades/flow'

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      next: { revalidate: 60 } // Cache for 1 minute (flow is fast-moving)
    })

    if (!response.ok) {
      console.error('UW Flow API error:', response.status)
      return NextResponse.json({
        status: 'demo',
        data: getDemoFlowData(symbol),
        message: `API error (${response.status}) - using demo data`
      })
    }

    const rawData = await response.json()

    // Process flow data
    const processedFlow = processFlowData(rawData, symbol)

    return NextResponse.json({
      status: 'live',
      data: processedFlow,
      timestamp: new Date().toISOString(),
      source: 'Unusual Whales'
    })

  } catch (error) {
    console.error('Options flow error:', error)
    return NextResponse.json({
      status: 'demo',
      data: getDemoFlowData(symbol),
      message: 'API error - using demo data'
    })
  }
}

/**
 * Process raw flow data into usable format
 */
function processFlowData(rawData: any, symbol?: string | null) {
  const flows: any[] = []

  if (!rawData) return { flows, summary: getDefaultSummary() }

  const data = Array.isArray(rawData) ? rawData : (rawData.data || [])

  data.forEach((flow: any) => {
    flows.push({
      symbol: flow.ticker || flow.symbol || symbol,
      strike: flow.strike || flow.strike_price,
      expiry: flow.expiry || flow.expiration_date,
      type: flow.put_call || flow.option_type || (flow.is_call ? 'CALL' : 'PUT'),
      premium: flow.premium || flow.total_premium || flow.value,
      volume: flow.volume || flow.size,
      openInterest: flow.open_interest || flow.oi,
      timestamp: flow.date_time || flow.timestamp || flow.trade_date,
      sentiment: flow.sentiment || (flow.is_call ? 'BULLISH' : 'BEARISH'),
      isUnusual: flow.is_unusual || flow.unusual || false
    })
  })

  // Calculate summary stats
  const summary = calculateFlowSummary(flows)

  return { flows, summary }
}

/**
 * Calculate summary statistics from flow data
 */
function calculateFlowSummary(flows: any[]) {
  const callFlows = flows.filter(f => f.type === 'CALL' || f.type === 'call')
  const putFlows = flows.filter(f => f.type === 'PUT' || f.type === 'put')

  const callPremium = callFlows.reduce((sum, f) => sum + (f.premium || 0), 0)
  const putPremium = putFlows.reduce((sum, f) => sum + (f.premium || 0), 0)

  const totalPremium = callPremium + putPremium
  const netPremium = callPremium - putPremium

  const putCallRatio = putPremium > 0 ? callPremium / putPremium : 0

  return {
    totalFlows: flows.length,
    callFlows: callFlows.length,
    putFlows: putFlows.length,
    callPremium,
    putPremium,
    totalPremium,
    netPremium,
    putCallRatio,
    sentiment: netPremium > 0 ? 'BULLISH' : 'BEARISH',
    flowScore: Math.min(100, Math.abs(netPremium) / 1000000) // Normalize to 0-100
  }
}

/**
 * Default summary when no data
 */
function getDefaultSummary() {
  return {
    totalFlows: 0,
    callFlows: 0,
    putFlows: 0,
    callPremium: 0,
    putPremium: 0,
    totalPremium: 0,
    netPremium: 0,
    putCallRatio: 0,
    sentiment: 'NEUTRAL',
    flowScore: 0
  }
}

/**
 * Demo flow data (fallback when API key not available)
 */
function getDemoFlowData(symbol?: string | null) {
  const demoData: any = {
    'SPY': {
      flows: [
        { symbol: 'SPY', strike: 480, expiry: '2024-01-19', type: 'CALL', premium: 2500000, volume: 5000, sentiment: 'BULLISH', isUnusual: true },
        { symbol: 'SPY', strike: 475, expiry: '2024-01-19', type: 'PUT', premium: 1200000, volume: 2400, sentiment: 'BEARISH', isUnusual: false }
      ],
      summary: {
        totalFlows: 2,
        callFlows: 1,
        putFlows: 1,
        callPremium: 2500000,
        putPremium: 1200000,
        totalPremium: 3700000,
        netPremium: 1300000,
        putCallRatio: 2.08,
        sentiment: 'BULLISH',
        flowScore: 85
      }
    },
    'NVDA': {
      flows: [
        { symbol: 'NVDA', strike: 900, expiry: '2024-02-16', type: 'CALL', premium: 3800000, volume: 3200, sentiment: 'BULLISH', isUnusual: true },
        { symbol: 'NVDA', strike: 850, expiry: '2024-02-16', type: 'CALL', premium: 2100000, volume: 1800, sentiment: 'BULLISH', isUnusual: true }
      ],
      summary: {
        totalFlows: 2,
        callFlows: 2,
        putFlows: 0,
        callPremium: 5900000,
        putPremium: 0,
        totalPremium: 5900000,
        netPremium: 5900000,
        putCallRatio: 0,
        sentiment: 'BULLISH',
        flowScore: 95
      }
    },
    'TSLA': {
      flows: [
        { symbol: 'TSLA', strike: 240, expiry: '2024-01-26', type: 'PUT', premium: 1800000, volume: 3600, sentiment: 'BEARISH', isUnusual: true },
        { symbol: 'TSLA', strike: 250, expiry: '2024-01-26', type: 'CALL', premium: 900000, volume: 1500, sentiment: 'BULLISH', isUnusual: false }
      ],
      summary: {
        totalFlows: 2,
        callFlows: 1,
        putFlows: 1,
        callPremium: 900000,
        putPremium: 1800000,
        totalPremium: 2700000,
        netPremium: -900000,
        putCallRatio: 0.5,
        sentiment: 'BEARISH',
        flowScore: 72
      }
    }
  }

  if (symbol && demoData[symbol]) {
    return demoData[symbol]
  }

  // Return aggregate market-wide demo data
  return {
    flows: Object.values(demoData).flatMap((d: any) => d.flows),
    summary: {
      totalFlows: 6,
      callFlows: 4,
      putFlows: 2,
      callPremium: 9300000,
      putPremium: 3000000,
      totalPremium: 12300000,
      netPremium: 6300000,
      putCallRatio: 3.1,
      sentiment: 'BULLISH',
      flowScore: 82
    }
  }
}
