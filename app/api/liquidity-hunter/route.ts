import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeLiquidityHunter,
  DEFAULT_CONFIG,
  type PriceBar,
  type LiquidityHunterConfig,
} from '@/app/lib/liquidity-hunter'

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDITY HUNTER API - Dedicated endpoint for watchlist
// Fast, symbol-specific FVG and order flow analysis
// ═══════════════════════════════════════════════════════════════════════════

interface TimeframeLiquidity {
  activeFVGCount: number
  bullishFVGCount: number
  bearishFVGCount: number
  liquidityZoneCount: number
  buyVolume: number
  sellVolume: number
  delta: number
  avgAbsDelta: number
  isSignificantBuying: boolean
  isSignificantSelling: boolean
  liquidityScore: number
  liquiditySignals: string[]
  direction: 'bullish' | 'bearish' | 'neutral'
}

interface LiquidityStockData {
  symbol: string
  price: number
  changePercent: number
  volume: number
  fiveMin: TimeframeLiquidity
  daily: TimeframeLiquidity
  aligned: boolean
  alignmentStrength: number
  alignmentDirection: 'bullish' | 'bearish' | 'neutral'
}

/**
 * Fetch daily price bars for a symbol
 */
async function fetchDailyBarsForSymbol(symbol: string): Promise<PriceBar[]> {
  const polygonKey = process.env.POLYGON_API_KEY
  const fmpKey = process.env.FMP_API_KEY

  // Try Polygon first (preferred)
  if (polygonKey) {
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000) // Last year
      const fromDate = from.toISOString().split('T')[0]
      const toDate = to.toISOString().split('T')[0]

      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${polygonKey}`

      const response = await fetch(url, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const bars: PriceBar[] = data.results.map((bar: any) => ({
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v,
            timestamp: bar.t,
          }))
          return bars.slice(-100) // Last 100 bars
        }
      }
    } catch (error) {
      console.error(`Polygon daily bars error for ${symbol}:`, error)
    }
  }

  // Fallback to FMP
  if (fmpKey) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${fmpKey}`
      const response = await fetch(url, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        if (data.historical && Array.isArray(data.historical) && data.historical.length > 0) {
          const bars: PriceBar[] = data.historical.map((bar: any) => ({
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
            timestamp: new Date(bar.date).getTime(),
          }))
          return bars.slice(0, 100).reverse() // FMP returns newest first
        }
      }
    } catch (error) {
      console.error(`FMP daily bars error for ${symbol}:`, error)
    }
  }

  // Final fallback: generate mock data for development
  return generateMockBars(symbol, 100, 'daily')
}

/**
 * Fetch 5-minute price bars for a symbol
 */
async function fetchBarsForSymbol(symbol: string): Promise<PriceBar[]> {
  const polygonKey = process.env.POLYGON_API_KEY
  const fmpKey = process.env.FMP_API_KEY

  // Try Polygon first (preferred)
  if (polygonKey) {
    try {
      const to = new Date()
      const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      const fromDate = from.toISOString().split('T')[0]
      const toDate = to.toISOString().split('T')[0]

      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${polygonKey}`

      const response = await fetch(url, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          const bars: PriceBar[] = data.results.map((bar: any) => ({
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v,
            timestamp: bar.t,
          }))
          return bars.slice(-100) // Last 100 bars
        }
      }
    } catch (error) {
      console.error(`Polygon bars error for ${symbol}:`, error)
    }
  }

  // Fallback to FMP
  if (fmpKey) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/historical-chart/5min/${symbol}?apikey=${fmpKey}`
      const response = await fetch(url, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const bars: PriceBar[] = data.map((bar: any) => ({
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
            timestamp: new Date(bar.date).getTime(),
          }))
          return bars.slice(0, 100).reverse() // FMP returns newest first
        }
      }
    } catch (error) {
      console.error(`FMP bars error for ${symbol}:`, error)
    }
  }

  // Final fallback: generate mock data for development
  return generateMockBars(symbol, 100, '5min')
}

/**
 * Adjust configuration for different timeframes
 * Daily bars need different thresholds than intraday bars
 */
function adjustConfigForTimeframe(
  baseConfig: LiquidityHunterConfig,
  timeframe: '5min' | 'daily'
): LiquidityHunterConfig {
  if (timeframe === '5min') {
    return baseConfig
  }

  // Daily timeframe adjustments
  return {
    ...baseConfig,
    // Daily FVG threshold: Keep same or slightly lower (gaps should be similar %)
    fvgThreshold: baseConfig.fvgThreshold, // Keep at 0.5%

    // Daily delta threshold: Scale based on typical volume difference
    // For most stocks: 5-min has ~200K-500K volume, daily has ~5M-20M volume
    // Ratio is typically 10-30x, so use 15x as middle ground
    ofDeltaThreshold: baseConfig.ofDeltaThreshold * 15, // 1000 -> 15,000

    // Daily lookback: use more bars for better trend context
    ofLookback: Math.max(baseConfig.ofLookback, 20), // At least 20 days (1 month)
  }
}

/**
 * Determine liquidity direction based on analysis
 */
function getLiquidityDirection(
  bullishFVGs: number,
  bearishFVGs: number,
  delta: number,
  liquidityZones: number,
  signals: string[]
): 'bullish' | 'bearish' | 'neutral' {
  // Strong signal: active liquidity signals
  if (signals.length > 0) {
    const bullishSignals = signals.filter(s => s.includes('BULLISH')).length
    const bearishSignals = signals.filter(s => s.includes('BEARISH')).length
    if (bullishSignals > bearishSignals) return 'bullish'
    if (bearishSignals > bullishSignals) return 'bearish'
  }

  // Medium signal: Multiple FVGs in one direction with confirming delta
  const fvgDifference = bullishFVGs - bearishFVGs

  if (Math.abs(fvgDifference) >= 2) {
    // Strong FVG imbalance (2+ more in one direction)
    if (fvgDifference > 0) return 'bullish'
    if (fvgDifference < 0) return 'bearish'
  }

  if (liquidityZones > 0 && fvgDifference !== 0) {
    // At least one liquidity zone + FVG imbalance
    if (fvgDifference > 0 && delta > 0) return 'bullish'
    if (fvgDifference < 0 && delta < 0) return 'bearish'
  }

  // Weaker signal: Any FVG imbalance with positive delta
  if (fvgDifference > 0 && delta > 0) return 'bullish'
  if (fvgDifference < 0 && delta < 0) return 'bearish'

  // Very weak signal: Just FVG count (requires at least 1 FVG)
  if (bullishFVGs > 0 && bearishFVGs === 0) return 'bullish'
  if (bearishFVGs > 0 && bullishFVGs === 0) return 'bearish'

  return 'neutral'
}

/**
 * Check if two timeframes are aligned
 */
function checkAlignment(
  fiveMinDir: 'bullish' | 'bearish' | 'neutral',
  dailyDir: 'bullish' | 'bearish' | 'neutral',
  fiveMinScore: number,
  dailyScore: number
): { aligned: boolean; strength: number; direction: 'bullish' | 'bearish' | 'neutral' } {
  // Both must have a direction (not neutral)
  if (fiveMinDir === 'neutral' || dailyDir === 'neutral') {
    return { aligned: false, strength: 0, direction: 'neutral' }
  }

  // Directions must match
  if (fiveMinDir !== dailyDir) {
    return { aligned: false, strength: 0, direction: 'neutral' }
  }

  // Both must have meaningful scores (40+)
  if (fiveMinScore < 40 || dailyScore < 40) {
    return { aligned: false, strength: 0, direction: 'neutral' }
  }

  // Calculate alignment strength (average of both scores)
  const strength = Math.round((fiveMinScore + dailyScore) / 2)

  return { aligned: true, strength, direction: fiveMinDir }
}

/**
 * Generate mock price bars for development/testing
 */
function generateMockBars(symbol: string, count: number, timeframe: '5min' | 'daily' = '5min'): PriceBar[] {
  const bars: PriceBar[] = []
  const now = Date.now()
  const interval = timeframe === '5min' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000

  const basePrices: Record<string, number> = {
    NVDA: 875,
    TSLA: 242,
    AAPL: 195,
    SPY: 438,
    QQQ: 365,
    AMD: 165,
    MSFT: 385,
    META: 475,
    GOOGL: 142,
    AMZN: 178,
  }

  let price = basePrices[symbol] || 100

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * interval
    const changeAmount = timeframe === 'daily'
      ? (Math.random() - 0.48) * price * 0.02 // More volatility on daily
      : (Math.random() - 0.48) * price * 0.01 // Slight upward bias on 5min
    price = Math.max(price + changeAmount, price * 0.95)

    const open = price
    const volatility = timeframe === 'daily' ? price * 0.015 : price * 0.005
    const high = open + Math.random() * volatility
    const low = open - Math.random() * volatility
    const close = low + Math.random() * (high - low)
    const volume = timeframe === 'daily'
      ? Math.floor(Math.random() * 50000000) + 10000000
      : Math.floor(Math.random() * 1000000) + 500000

    bars.push({ open, high, low, close, volume, timestamp })
  }

  return bars
}

/**
 * Fetch current price data for a symbol
 */
async function fetchCurrentPrice(symbol: string): Promise<{ price: number; changePercent: number; volume: number }> {
  const polygonKey = process.env.POLYGON_API_KEY

  if (polygonKey) {
    try {
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${polygonKey}`
      const response = await fetch(url, { cache: 'no-store' })

      if (response.ok) {
        const data = await response.json()
        if (data.ticker) {
          const ticker = data.ticker
          const price = ticker.day?.c || ticker.lastTrade?.p || 0
          const changePercent = ticker.todaysChangePerc || 0
          const volume = ticker.day?.v || 0
          return { price, changePercent, volume }
        }
      }
    } catch (error) {
      console.error(`Price fetch error for ${symbol}:`, error)
    }
  }

  // Fallback: use last bar close price
  return { price: 0, changePercent: 0, volume: 0 }
}

/**
 * Main GET handler - analyzes liquidity for requested symbols
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing symbols parameter. Use ?symbols=AAPL,TSLA,NVDA' },
        { status: 400 }
      )
    }

    // Parse symbols
    const symbols = symbolsParam
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0)

    if (symbols.length === 0) {
      return NextResponse.json({ error: 'No valid symbols provided' }, { status: 400 })
    }

    if (symbols.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 symbols allowed' }, { status: 400 })
    }

    console.log(`Analyzing liquidity for ${symbols.length} symbols: ${symbols.join(', ')}`)

    // Parse custom config if provided (these are base values for 5-min)
    const config: LiquidityHunterConfig = {
      ...DEFAULT_CONFIG,
      fvgThreshold: parseFloat(searchParams.get('fvgThreshold') || '0.5'),
      ofDeltaThreshold: parseFloat(searchParams.get('deltaThreshold') || '1000'),
      liqDeltaMultiplier: parseFloat(searchParams.get('liqMultiplier') || '1.5'),
    }

    console.log(`Base config (5-min): FVG=${config.fvgThreshold}%, Delta=${config.ofDeltaThreshold}, LiqMult=${config.liqDeltaMultiplier}x`)
    const dailyConfigPreview = adjustConfigForTimeframe(config, 'daily')
    console.log(`Daily config: FVG=${dailyConfigPreview.fvgThreshold}%, Delta=${dailyConfigPreview.ofDeltaThreshold}, Lookback=${dailyConfigPreview.ofLookback}`)

    // Analyze each symbol in parallel
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Fetch 5-min bars, daily bars, and current price in parallel
          const [fiveMinBars, dailyBars, priceData] = await Promise.all([
            fetchBarsForSymbol(symbol),
            fetchDailyBarsForSymbol(symbol),
            fetchCurrentPrice(symbol),
          ])

          if (fiveMinBars.length < 3 || dailyBars.length < 3) {
            console.log(`Insufficient bars for ${symbol}: 5min=${fiveMinBars.length}, daily=${dailyBars.length}`)
            return null
          }

          // Run liquidity analysis on both timeframes with adjusted configs
          const fiveMinConfig = adjustConfigForTimeframe(config, '5min')
          const dailyConfig = adjustConfigForTimeframe(config, 'daily')

          const fiveMinResult = analyzeLiquidityHunter(symbol, fiveMinBars, fiveMinConfig)
          const dailyResult = analyzeLiquidityHunter(symbol, dailyBars, dailyConfig)

          // Debug logging for direction detection
          if (symbol === 'DOCN' || symbol === 'NVDA') {
            console.log(`\n=== ${symbol} Analysis ===`)
            console.log('5-Min:', {
              bullishFVGs: fiveMinResult.bullishFVGCount,
              bearishFVGs: fiveMinResult.bearishFVGCount,
              delta: fiveMinResult.orderFlow.delta.toFixed(0),
              liqZones: fiveMinResult.liquidityZoneCount,
              signals: fiveMinResult.signals.length,
              score: fiveMinResult.liquidityScore,
              threshold: fiveMinConfig.ofDeltaThreshold,
            })
            console.log('Daily:', {
              bullishFVGs: dailyResult.bullishFVGCount,
              bearishFVGs: dailyResult.bearishFVGCount,
              delta: dailyResult.orderFlow.delta.toFixed(0),
              liqZones: dailyResult.liquidityZoneCount,
              signals: dailyResult.signals.length,
              score: dailyResult.liquidityScore,
              threshold: dailyConfig.ofDeltaThreshold,
            })
          }

          // Determine direction for each timeframe
          const fiveMinDirection = getLiquidityDirection(
            fiveMinResult.bullishFVGCount,
            fiveMinResult.bearishFVGCount,
            fiveMinResult.orderFlow.delta,
            fiveMinResult.liquidityZoneCount,
            fiveMinResult.signals
          )

          const dailyDirection = getLiquidityDirection(
            dailyResult.bullishFVGCount,
            dailyResult.bearishFVGCount,
            dailyResult.orderFlow.delta,
            dailyResult.liquidityZoneCount,
            dailyResult.signals
          )

          // Check alignment
          const alignment = checkAlignment(
            fiveMinDirection,
            dailyDirection,
            fiveMinResult.liquidityScore,
            dailyResult.liquidityScore
          )

          // Debug alignment result
          if (symbol === 'DOCN' || symbol === 'NVDA') {
            console.log(`${symbol} Directions: 5min=${fiveMinDirection}, daily=${dailyDirection}`)
            console.log(`${symbol} Alignment:`, alignment)
          }

          // Use current price from API, or fall back to last 5min bar
          const price = priceData.price > 0 ? priceData.price : fiveMinBars[fiveMinBars.length - 1].close
          const volume = priceData.volume > 0 ? priceData.volume : fiveMinBars[fiveMinBars.length - 1].volume

          const stockData: LiquidityStockData = {
            symbol,
            price,
            changePercent: priceData.changePercent,
            volume,
            fiveMin: {
              activeFVGCount: fiveMinResult.activeFVGCount,
              bullishFVGCount: fiveMinResult.bullishFVGCount,
              bearishFVGCount: fiveMinResult.bearishFVGCount,
              liquidityZoneCount: fiveMinResult.liquidityZoneCount,
              buyVolume: fiveMinResult.orderFlow.buyVolume,
              sellVolume: fiveMinResult.orderFlow.sellVolume,
              delta: fiveMinResult.orderFlow.delta,
              avgAbsDelta: fiveMinResult.orderFlow.avgAbsDelta,
              isSignificantBuying: fiveMinResult.orderFlow.isSignificantBuying,
              isSignificantSelling: fiveMinResult.orderFlow.isSignificantSelling,
              liquidityScore: fiveMinResult.liquidityScore,
              liquiditySignals: fiveMinResult.signals,
              direction: fiveMinDirection,
            },
            daily: {
              activeFVGCount: dailyResult.activeFVGCount,
              bullishFVGCount: dailyResult.bullishFVGCount,
              bearishFVGCount: dailyResult.bearishFVGCount,
              liquidityZoneCount: dailyResult.liquidityZoneCount,
              buyVolume: dailyResult.orderFlow.buyVolume,
              sellVolume: dailyResult.orderFlow.sellVolume,
              delta: dailyResult.orderFlow.delta,
              avgAbsDelta: dailyResult.orderFlow.avgAbsDelta,
              isSignificantBuying: dailyResult.orderFlow.isSignificantBuying,
              isSignificantSelling: dailyResult.orderFlow.isSignificantSelling,
              liquidityScore: dailyResult.liquidityScore,
              liquiditySignals: dailyResult.signals,
              direction: dailyDirection,
            },
            aligned: alignment.aligned,
            alignmentStrength: alignment.strength,
            alignmentDirection: alignment.direction,
          }

          return stockData
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error)
          return null
        }
      })
    )

    // Filter out failed analyses
    const validResults = results.filter((r): r is LiquidityStockData => r !== null)

    console.log(`Successfully analyzed ${validResults.length}/${symbols.length} symbols`)

    return NextResponse.json({
      data: validResults,
      timestamp: new Date().toISOString(),
      status: 'success',
      count: validResults.length,
      config,
    })
  } catch (error) {
    console.error('Liquidity Hunter API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
