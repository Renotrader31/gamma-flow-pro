import { NextResponse } from 'next/server'
import { PriceBar } from '@/app/lib/liquidity-hunter'

/**
 * API Route: Fetch historical price bars for a symbol
 * Used for Fair Value Gap detection and Order Flow analysis
 *
 * GET /api/bars/[symbol]?timeframe=5&limit=100
 */

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = params.symbol.toUpperCase()
    const timeframe = searchParams.get('timeframe') || '5' // Default 5-minute bars
    const limit = parseInt(searchParams.get('limit') || '100') // Default 100 bars

    const apiKey = process.env.POLYGON_API_KEY

    if (!apiKey) {
      console.log('No Polygon API key found for bars endpoint')

      // Return mock data for development
      return NextResponse.json({
        symbol,
        bars: generateMockBars(symbol, limit),
        timeframe,
        timestamp: new Date().toISOString(),
        status: 'mock',
      })
    }

    // Calculate date range (last 7 days)
    const to = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Format dates as YYYY-MM-DD
    const fromDate = from.toISOString().split('T')[0]
    const toDate = to.toISOString().split('T')[0]

    // Fetch aggregates (bars) from Polygon
    // https://polygon.io/docs/stocks/get_v2_aggs_ticker__stocksticker__range__multiplier___timespan___from___to
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${timeframe}/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=${limit}&apiKey=${apiKey}`

    console.log(`Fetching bars for ${symbol}...`)

    const response = await fetch(url, {
      cache: 'no-store', // Don't cache to get live data
    })

    if (!response.ok) {
      console.log(`Polygon bars response not OK: ${response.status}`)

      // Fallback to mock data
      return NextResponse.json({
        symbol,
        bars: generateMockBars(symbol, limit),
        timeframe,
        timestamp: new Date().toISOString(),
        status: 'fallback',
      })
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      console.log(`No bar data for ${symbol}`)

      return NextResponse.json({
        symbol,
        bars: generateMockBars(symbol, limit),
        timeframe,
        timestamp: new Date().toISOString(),
        status: 'no_data',
      })
    }

    // Convert Polygon format to our PriceBar format
    const bars: PriceBar[] = data.results.map((bar: any) => ({
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timestamp: bar.t,
    }))

    console.log(`Got ${bars.length} bars for ${symbol}`)

    return NextResponse.json({
      symbol,
      bars: bars.slice(-limit), // Return last N bars
      timeframe,
      timestamp: new Date().toISOString(),
      status: 'success',
      count: bars.length,
    })
  } catch (error) {
    console.error('Bars API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch price bars',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate mock price bars for development/testing
 */
function generateMockBars(symbol: string, count: number): PriceBar[] {
  const bars: PriceBar[] = []
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  // Base prices for common symbols
  const basePrices: Record<string, number> = {
    NVDA: 875,
    TSLA: 242,
    AAPL: 195,
    SPY: 438,
    QQQ: 365,
    AMD: 165,
    MSFT: 385,
  }

  let price = basePrices[symbol] || 100

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * fiveMinutes

    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * price * 0.01
    price = Math.max(price + change, price * 0.95)

    const open = price
    const volatility = price * 0.005 // 0.5% volatility
    const high = open + Math.random() * volatility
    const low = open - Math.random() * volatility
    const close = low + Math.random() * (high - low)

    const volume = Math.floor(Math.random() * 1000000) + 100000

    bars.push({
      open,
      high,
      low,
      close,
      volume,
      timestamp,
    })
  }

  return bars
}
