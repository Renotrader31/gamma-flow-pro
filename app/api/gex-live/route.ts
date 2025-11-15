import { NextResponse } from 'next/server'

/**
 * Fetch real gamma exposure (GEX) data from Unusual Whales API
 * Identifies dealer positioning and potential support/resistance levels
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'SPY'
  const apiKey = process.env.UNUSUAL_WHALES_KEY

  if (!apiKey) {
    return NextResponse.json({
      status: 'demo',
      data: getDemoGEXData(symbol),
      message: 'Using demo data - set UNUSUAL_WHALES_KEY for real data'
    })
  }

  try {
    // Fetch GEX data from Unusual Whales
    const response = await fetch(
      `https://api.unusualwhales.com/api/stock/${symbol}/gex`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      console.error('UW GEX API error:', response.status)
      return NextResponse.json({
        status: 'demo',
        data: getDemoGEXData(symbol),
        message: `API error (${response.status}) - using demo data`
      })
    }

    const rawData = await response.json()

    // Process GEX data
    const processedData = processGEXData(rawData, symbol)

    return NextResponse.json({
      status: 'live',
      data: processedData,
      timestamp: new Date().toISOString(),
      source: 'Unusual Whales'
    })

  } catch (error) {
    console.error('GEX error:', error)
    return NextResponse.json({
      status: 'demo',
      data: getDemoGEXData(symbol),
      message: 'API error - using demo data'
    })
  }
}

/**
 * Process raw GEX data
 */
function processGEXData(rawData: any, symbol: string) {
  if (!rawData || !rawData.data) {
    return getDemoGEXData(symbol)
  }

  const levels = rawData.data || []

  // Sort by strike
  levels.sort((a: any, b: any) => (a.strike || 0) - (b.strike || 0))

  // Find key levels
  const maxGEX = Math.max(...levels.map((l: any) => Math.abs(l.gex || 0)))
  const significantLevels = levels.filter((l: any) =>
    Math.abs(l.gex || 0) > maxGEX * 0.3 // 30% of max is significant
  )

  // Identify positive (resistance) and negative (support/amplification) zones
  const resistance = significantLevels
    .filter((l: any) => (l.gex || 0) > 0)
    .sort((a: any, b: any) => (b.gex || 0) - (a.gex || 0))
    .slice(0, 5)

  const support = significantLevels
    .filter((l: any) => (l.gex || 0) < 0)
    .sort((a: any, b: any) => (a.gex || 0) - (b.gex || 0))
    .slice(0, 5)

  // Find gamma flip point (where GEX crosses zero)
  const gammaFlip = findGammaFlip(levels)

  return {
    symbol,
    levels: levels.map((l: any) => ({
      strike: l.strike,
      gex: l.gex || 0,
      dex: l.dex || 0,
      callGEX: l.call_gex || 0,
      putGEX: l.put_gex || 0,
      openInterest: l.open_interest || 0
    })),
    resistance: resistance.map((l: any) => ({
      strike: l.strike,
      gex: l.gex
    })),
    support: support.map((l: any) => ({
      strike: l.strike,
      gex: l.gex
    })),
    gammaFlip,
    totalGEX: levels.reduce((sum: number, l: any) => sum + (l.gex || 0), 0),
    maxGEX
  }
}

/**
 * Find gamma flip point (zero-crossing)
 */
function findGammaFlip(levels: any[]) {
  for (let i = 0; i < levels.length - 1; i++) {
    const current = levels[i].gex || 0
    const next = levels[i + 1].gex || 0

    // Flip occurs when GEX changes sign
    if ((current > 0 && next < 0) || (current < 0 && next > 0)) {
      return {
        strike: (levels[i].strike + levels[i + 1].strike) / 2,
        direction: current > 0 ? 'BEARISH' : 'BULLISH' // Above flip = bearish, below = bullish
      }
    }
  }

  return null
}

/**
 * Demo GEX data
 */
function getDemoGEXData(symbol: string) {
  const demoData: any = {
    'SPY': {
      symbol: 'SPY',
      levels: [
        { strike: 470, gex: -1200000000, dex: 50000, callGEX: -500000000, putGEX: -700000000, openInterest: 50000 },
        { strike: 475, gex: -800000000, dex: 30000, callGEX: -300000000, putGEX: -500000000, openInterest: 45000 },
        { strike: 478, gex: 0, dex: 0, callGEX: 0, putGEX: 0, openInterest: 30000 }, // Gamma flip
        { strike: 480, gex: 2500000000, dex: -80000, callGEX: 1500000000, putGEX: 1000000000, openInterest: 75000 },
        { strike: 485, gex: 1800000000, dex: -60000, callGEX: 1100000000, putGEX: 700000000, openInterest: 60000 },
        { strike: 490, gex: 900000000, dex: -40000, callGEX: 600000000, putGEX: 300000000, openInterest: 40000 }
      ],
      resistance: [
        { strike: 480, gex: 2500000000 },
        { strike: 485, gex: 1800000000 },
        { strike: 490, gex: 900000000 }
      ],
      support: [
        { strike: 470, gex: -1200000000 },
        { strike: 475, gex: -800000000 }
      ],
      gammaFlip: { strike: 478, direction: 'BULLISH' },
      totalGEX: 3200000000,
      maxGEX: 2500000000
    },
    'NVDA': {
      symbol: 'NVDA',
      levels: [
        { strike: 850, gex: -500000000, dex: 25000, callGEX: -200000000, putGEX: -300000000, openInterest: 20000 },
        { strike: 870, gex: -200000000, dex: 10000, callGEX: -100000000, putGEX: -100000000, openInterest: 15000 },
        { strike: 875, gex: 0, dex: 0, callGEX: 0, putGEX: 0, openInterest: 12000 }, // Gamma flip
        { strike: 880, gex: 1200000000, dex: -40000, callGEX: 700000000, putGEX: 500000000, openInterest: 30000 },
        { strike: 900, gex: 1800000000, dex: -60000, callGEX: 1100000000, putGEX: 700000000, openInterest: 35000 },
        { strike: 920, gex: 800000000, dex: -30000, callGEX: 500000000, putGEX: 300000000, openInterest: 25000 }
      ],
      resistance: [
        { strike: 900, gex: 1800000000 },
        { strike: 880, gex: 1200000000 },
        { strike: 920, gex: 800000000 }
      ],
      support: [
        { strike: 850, gex: -500000000 },
        { strike: 870, gex: -200000000 }
      ],
      gammaFlip: { strike: 875, direction: 'BULLISH' },
      totalGEX: 3100000000,
      maxGEX: 1800000000
    },
    'TSLA': {
      symbol: 'TSLA',
      levels: [
        { strike: 235, gex: -300000000, dex: 15000, callGEX: -150000000, putGEX: -150000000, openInterest: 18000 },
        { strike: 240, gex: -100000000, dex: 5000, callGEX: -50000000, putGEX: -50000000, openInterest: 12000 },
        { strike: 243, gex: 0, dex: 0, callGEX: 0, putGEX: 0, openInterest: 10000 }, // Gamma flip
        { strike: 245, gex: 600000000, dex: -20000, callGEX: 350000000, putGEX: 250000000, openInterest: 25000 },
        { strike: 250, gex: 900000000, dex: -35000, callGEX: 550000000, putGEX: 350000000, openInterest: 30000 },
        { strike: 255, gex: 500000000, dex: -18000, callGEX: 300000000, putGEX: 200000000, openInterest: 20000 }
      ],
      resistance: [
        { strike: 250, gex: 900000000 },
        { strike: 245, gex: 600000000 },
        { strike: 255, gex: 500000000 }
      ],
      support: [
        { strike: 235, gex: -300000000 },
        { strike: 240, gex: -100000000 }
      ],
      gammaFlip: { strike: 243, direction: 'BULLISH' },
      totalGEX: 2500000000,
      maxGEX: 900000000
    }
  }

  return demoData[symbol] || demoData['SPY']
}
