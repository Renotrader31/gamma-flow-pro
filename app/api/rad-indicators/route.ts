import { NextResponse } from 'next/server'
import type { PriceBar } from '@/app/lib/liquidity-hunter'
import {
  analyzeRADIndicators,
  generateMockOptionsData,
  type OptionsData,
  type RADIndicatorResult
} from '@/app/lib/rad-indicators'

/**
 * API Route: RAD Indicators - Complete Trading Analysis
 *
 * Combines:
 * - RAD (Resistance After Dip) - Post-dip behavior patterns
 * - TANK Chart/Table - Real-time order flow & dark pool injections
 * - MP/LP (Magnet Price/Liquidity Pull) - OI-based price attraction zones
 * - OSV (Options Strike Volume) - Multi-ticker strike analysis
 *
 * GET /api/rad-indicators?symbol=AAPL
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')?.toUpperCase()

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    console.log(`📊 Fetching RAD indicators for ${symbol}`)

    // Fetch price bars
    const bars = await fetchPriceBars(symbol)

    // Fetch options data (for MP/LP and OSV)
    const optionsData = await fetchOptionsData(symbol, bars[bars.length - 1]?.close || 100)

    // Fetch dark pool ratio
    const darkPoolRatio = await fetchDarkPoolRatio(symbol)

    // Run the full RAD analysis
    const result = analyzeRADIndicators(symbol, bars, optionsData, darkPoolRatio)

    console.log(`✅ RAD analysis complete for ${symbol}: Score ${result.compositeScore}, Signal: ${result.actionSignal}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('RAD Indicators API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze RAD indicators',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch price bars from Polygon API
 */
async function fetchPriceBars(symbol: string): Promise<PriceBar[]> {
  const apiKey = process.env.POLYGON_API_KEY

  if (!apiKey) {
    console.log('No Polygon API key, using mock data')
    return generateMockBars(symbol, 100)
  }

  try {
    const to = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromDate = from.toISOString().split('T')[0]
    const toDate = to.toISOString().split('T')[0]

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${apiKey}`

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      console.log(`Polygon response not OK: ${response.status}`)
      return generateMockBars(symbol, 100)
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return generateMockBars(symbol, 100)
    }

    return data.results.map((bar: any) => ({
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timestamp: bar.t,
    }))
  } catch (error) {
    console.error('Error fetching bars:', error)
    return generateMockBars(symbol, 100)
  }
}

/**
 * Fetch options data from Polygon/Unusual Whales
 */
async function fetchOptionsData(symbol: string, currentPrice: number): Promise<OptionsData> {
  // Try Unusual Whales for detailed options data
  if (process.env.UNUSUAL_WHALES_API_KEY) {
    try {
      const uwResponse = await fetch(
        `https://api.unusualwhales.com/api/stock/${symbol}/options/chain`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
            Accept: 'application/json',
          },
        }
      )

      if (uwResponse.ok) {
        const data = await uwResponse.json()

        // Process UW options data
        if (data.data && data.data.length > 0) {
          return processUWOptionsData(data.data, currentPrice, symbol)
        }
      }
    } catch (error) {
      console.log('UW options data unavailable, using Polygon')
    }
  }

  // Try Polygon for options snapshot
  const polygonKey = process.env.POLYGON_API_KEY
  if (polygonKey) {
    try {
      const response = await fetch(
        `https://api.polygon.io/v3/snapshot/options/${symbol}?limit=100&apiKey=${polygonKey}`,
        { cache: 'no-store' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          return processPolygonOptionsData(data.results, currentPrice, symbol)
        }
      }
    } catch (error) {
      console.log('Polygon options unavailable')
    }
  }

  // Fallback to mock data
  console.log(`Using mock options data for ${symbol}`)
  const gexData = await fetchGEXData(symbol)
  return generateMockOptionsData(currentPrice, gexData.gex, gexData.gammaFlip)
}

/**
 * Process Unusual Whales options chain data
 */
function processUWOptionsData(data: any[], currentPrice: number, symbol: string): OptionsData {
  const strikeMap = new Map<number, OptionsData['strikes'][0]>()

  for (const option of data) {
    const strike = option.strike_price || option.strike
    if (!strike) continue

    const existing = strikeMap.get(strike) || {
      strike,
      callOI: 0,
      putOI: 0,
      callVolume: 0,
      putVolume: 0,
      callGamma: 0,
      putGamma: 0,
      callPremium: 0,
      putPremium: 0,
    }

    if (option.option_type === 'call' || option.type === 'C') {
      existing.callOI = option.open_interest || option.oi || 0
      existing.callVolume = option.volume || 0
      existing.callGamma = option.gamma || 0.01
      existing.callPremium = (option.ask + option.bid) / 2 * option.volume * 100 || 0
    } else {
      existing.putOI = option.open_interest || option.oi || 0
      existing.putVolume = option.volume || 0
      existing.putGamma = option.gamma || 0.01
      existing.putPremium = (option.ask + option.bid) / 2 * option.volume * 100 || 0
    }

    strikeMap.set(strike, existing)
  }

  const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike)

  // Calculate aggregate metrics
  const totalCallOI = strikes.reduce((sum, s) => sum + s.callOI, 0)
  const totalPutOI = strikes.reduce((sum, s) => sum + s.putOI, 0)

  // Estimate GEX and gamma flip
  const totalGamma = strikes.reduce((sum, s) => sum + (s.callGamma - s.putGamma) * (s.callOI - s.putOI), 0)
  const gammaFlip = estimateGammaFlip(strikes, currentPrice)

  return {
    strikes,
    currentPrice,
    gex: totalGamma * 100000, // Scale to match expected values
    gammaFlip,
  }
}

/**
 * Process Polygon options snapshot data
 */
function processPolygonOptionsData(data: any[], currentPrice: number, symbol: string): OptionsData {
  const strikeMap = new Map<number, OptionsData['strikes'][0]>()

  for (const option of data) {
    const details = option.details
    if (!details) continue

    const strike = details.strike_price
    const existing = strikeMap.get(strike) || {
      strike,
      callOI: 0,
      putOI: 0,
      callVolume: 0,
      putVolume: 0,
      callGamma: 0,
      putGamma: 0,
      callPremium: 0,
      putPremium: 0,
    }

    const greeks = option.greeks || {}
    const dayData = option.day || {}

    if (details.contract_type === 'call') {
      existing.callOI = option.open_interest || 0
      existing.callVolume = dayData.volume || 0
      existing.callGamma = greeks.gamma || 0.01
      existing.callPremium = (dayData.close || option.last_quote?.midpoint || 0) * dayData.volume * 100
    } else {
      existing.putOI = option.open_interest || 0
      existing.putVolume = dayData.volume || 0
      existing.putGamma = greeks.gamma || 0.01
      existing.putPremium = (dayData.close || option.last_quote?.midpoint || 0) * dayData.volume * 100
    }

    strikeMap.set(strike, existing)
  }

  const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike)
  const gammaFlip = estimateGammaFlip(strikes, currentPrice)
  const totalGamma = strikes.reduce((sum, s) => sum + (s.callGamma - s.putGamma) * (s.callOI - s.putOI), 0)

  return {
    strikes,
    currentPrice,
    gex: totalGamma * 100000,
    gammaFlip,
  }
}

/**
 * Estimate gamma flip level from strike data
 */
function estimateGammaFlip(strikes: OptionsData['strikes'], currentPrice: number): number {
  let cumulativeGamma = 0
  let flipPoint = currentPrice

  // Start from lowest strike
  for (const strike of strikes) {
    const netGamma = (strike.callGamma * strike.callOI) - (strike.putGamma * strike.putOI)
    cumulativeGamma += netGamma

    // Gamma flip is where cumulative gamma crosses zero
    if (cumulativeGamma > 0 && strike.strike >= currentPrice * 0.95 && strike.strike <= currentPrice * 1.05) {
      flipPoint = strike.strike
      break
    }
  }

  return flipPoint
}

/**
 * Fetch GEX data for a symbol
 */
async function fetchGEXData(symbol: string): Promise<{ gex: number; gammaFlip: number }> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/gex/${symbol}`, { cache: 'no-store' })
    if (response.ok) {
      const data = await response.json()
      return {
        gex: data.data?.totalGex || 0,
        gammaFlip: data.data?.gammaFlip || 0,
      }
    }
  } catch (error) {
    console.log('Could not fetch GEX data')
  }

  return { gex: 0, gammaFlip: 0 }
}

/**
 * Fetch dark pool ratio from Unusual Whales
 */
async function fetchDarkPoolRatio(symbol: string): Promise<number> {
  if (!process.env.UNUSUAL_WHALES_API_KEY) {
    return 0.35 + Math.random() * 0.2 // Mock 35-55%
  }

  try {
    const response = await fetch(
      `https://api.unusualwhales.com/api/darkpool/tickers/${symbol}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          Accept: 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      return data.data?.dark_pool_percent || data.dark_pool_ratio || 0.4
    }
  } catch (error) {
    console.log('Dark pool data unavailable')
  }

  return 0.4 // Default 40%
}

/**
 * Generate mock price bars
 */
function generateMockBars(symbol: string, count: number): PriceBar[] {
  const bars: PriceBar[] = []
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

  const basePrices: Record<string, number> = {
    NVDA: 140,
    TSLA: 248,
    AAPL: 228,
    SPY: 589,
    QQQ: 516,
    AMD: 165,
    MSFT: 441,
    GOOGL: 175,
    AMZN: 200,
    META: 580,
  }

  let price = basePrices[symbol] || 100

  // Add some realistic patterns
  const addDip = Math.random() > 0.5
  const dipStart = Math.floor(count * 0.3)
  const dipEnd = Math.floor(count * 0.5)

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * fiveMinutes

    // Create a dip pattern
    let change: number
    if (addDip && i > dipStart && i < dipEnd) {
      change = -price * 0.003 * (1 + Math.random()) // Stronger down move
    } else if (addDip && i <= dipStart && i > dipStart - 10) {
      change = price * 0.002 * (1 + Math.random()) // Recovery
    } else {
      change = (Math.random() - 0.48) * price * 0.008
    }

    price = Math.max(price + change, price * 0.9)

    const open = price
    const volatility = price * 0.004
    const high = open + Math.random() * volatility
    const low = open - Math.random() * volatility
    const close = low + Math.random() * (high - low)

    // Volume with occasional spikes
    const baseVolume = 500000
    const volumeSpike = Math.random() > 0.9 ? 3 : 1
    const volume = Math.floor((baseVolume + Math.random() * baseVolume) * volumeSpike)

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
