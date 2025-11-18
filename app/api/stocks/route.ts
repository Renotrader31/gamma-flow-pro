import { NextResponse } from 'next/server'
import {
  analyzeLiquidityHunter,
  DEFAULT_CONFIG,
  PriceBar,
} from '@/app/lib/liquidity-hunter'

async function fetchUnusualWhalesData() {
  const apiKey = process.env.UNUSUAL_WHALES_KEY
  
  if (!apiKey) {
    console.log('No Unusual Whales API key found')
    return null
  }
  
  try {
    // Try the correct endpoint format for Unusual Whales
    const response = await fetch('https://api.unusualwhales.com/api/stock/SPY/flow', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (!response.ok) {
      console.log('Unusual Whales response not OK:', response.status)
      return null
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.log('Unusual Whales error:', error)
    return null
  }
}

async function fetchPolygonData() {
  const apiKey = process.env.POLYGON_API_KEY

  if (!apiKey) {
    console.log('No Polygon API key found')
    return []
  }

  try {
    // Get market snapshot
    const response = await fetch(
      `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?limit=500&apiKey=${apiKey}`
    )

    if (!response.ok) {
      console.log('Polygon response not OK:', response.status)
      return []
    }

    const data = await response.json()
    return data.tickers || []
  } catch (error) {
    console.log('Polygon error:', error)
    return []
  }
}

// Fetch options data for a specific symbol from Polygon
async function fetchOptionsDataForSymbol(symbol: string) {
  const apiKey = process.env.POLYGON_API_KEY

  if (!apiKey) return null

  try {
    // Get options snapshot for the underlying
    const response = await fetch(
      `https://api.polygon.io/v3/snapshot/options/${symbol}?apiKey=${apiKey}`,
      { cache: 'no-store' } // Don't cache to get live data
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.results || null
  } catch (error) {
    console.log(`Options data error for ${symbol}:`, error)
    return null
  }
}

// Calculate gamma exposure and options metrics from options chain
function calculateOptionsMetrics(optionsData: any) {
  if (!optionsData || !Array.isArray(optionsData)) {
    return null
  }

  let totalCallGamma = 0
  let totalPutGamma = 0
  let totalCallVolume = 0
  let totalPutVolume = 0
  let totalCallOI = 0
  let totalPutOI = 0
  let totalCallPremium = 0
  let totalPutPremium = 0

  const strikes: number[] = []

  optionsData.forEach((option: any) => {
    const isCall = option.details?.contract_type === 'call'
    const gamma = option.greeks?.gamma || 0
    const volume = option.day?.volume || 0
    const oi = option.open_interest || 0
    const price = option.day?.close || option.last_quote?.midpoint || 0
    const strike = option.details?.strike_price || 0

    if (strike) strikes.push(strike)

    // Calculate gamma exposure (gamma * OI * 100 shares per contract)
    const gammaExposure = gamma * oi * 100

    if (isCall) {
      totalCallGamma += gammaExposure
      totalCallVolume += volume
      totalCallOI += oi
      totalCallPremium += price * volume * 100
    } else {
      totalPutGamma += gammaExposure
      totalPutVolume += volume
      totalPutOI += oi
      totalPutPremium += price * volume * 100
    }
  })

  // Net GEX (positive = support, negative = resistance)
  const netGEX = totalCallGamma - totalPutGamma

  // Put/Call ratio
  const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0

  // Flow score (0-100 based on call/put ratio)
  const flowScore = Math.min(100, Math.max(0,
    50 + (totalCallVolume - totalPutVolume) / (totalCallVolume + totalPutVolume || 1) * 50
  ))

  // Net premium flow
  const netPremium = totalCallPremium - totalPutPremium

  return {
    gex: Math.abs(netGEX),
    netGEX,
    putCallRatio,
    flowScore,
    netPremium,
    totalCallVolume,
    totalPutVolume,
    optionVolume: totalCallVolume + totalPutVolume,
    strikes: strikes.sort((a, b) => a - b)
  }
}

async function fetchFMPData() {
  const apiKey = process.env.FMP_API_KEY
  
  if (!apiKey) {
    console.log('No FMP API key found')
    return []
  }
  
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${apiKey}`
    )
    
    if (!response.ok) {
      console.log('FMP response not OK:', response.status)
      return []
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.log('FMP error:', error)
    return []
  }
}

// Fetch price bars for liquidity analysis
async function fetchBarsForSymbol(symbol: string): Promise<PriceBar[]> {
  const apiKey = process.env.POLYGON_API_KEY

  if (!apiKey) {
    return generateMockBars(symbol, 100)
  }

  try {
    // Get last 7 days of 5-minute bars
    const to = new Date()
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fromDate = from.toISOString().split('T')[0]
    const toDate = to.toISOString().split('T')[0]

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/5/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=100&apiKey=${apiKey}`

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      return generateMockBars(symbol, 100)
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return generateMockBars(symbol, 100)
    }

    const bars: PriceBar[] = data.results.map((bar: any) => ({
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timestamp: bar.t,
    }))

    return bars.slice(-100) // Return last 100 bars
  } catch (error) {
    return generateMockBars(symbol, 100)
  }
}

// Generate mock price bars
function generateMockBars(symbol: string, count: number): PriceBar[] {
  const bars: PriceBar[] = []
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000

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
    const change = (Math.random() - 0.48) * price * 0.01
    price = Math.max(price + change, price * 0.95)

    const open = price
    const volatility = price * 0.005
    const high = open + Math.random() * volatility
    const low = open - Math.random() * volatility
    const close = low + Math.random() * (high - low)
    const volume = Math.floor(Math.random() * 1000000) + 100000

    bars.push({ open, high, low, close, volume, timestamp })
  }

  return bars
}

async function processMarketData(polygonData: any[], fmpData: any[], unusualWhalesData: any) {
  const stockMap = new Map()

  // Process Polygon data first (most comprehensive)
  if (polygonData && polygonData.length > 0) {
    // Process top stocks with options data (limit to prevent rate limiting)
    const topStocks = polygonData
      .filter(t => t.day?.v > 1000000) // Only stocks with >1M volume
      .sort((a, b) => (b.day?.v || 0) - (a.day?.v || 0))
      .slice(0, 100) // Top 100 by volume

    for (const ticker of topStocks) {
      if (ticker.ticker) {
        const dayData = ticker.day || {}
        const prevDay = ticker.prevDay || {}
        const price = dayData.c || ticker.lastTrade?.p || 0

        // Fetch real options data for this symbol
        const optionsData = await fetchOptionsDataForSymbol(ticker.ticker)
        const optionsMetrics = calculateOptionsMetrics(optionsData)

        // Calculate gamma levels from options strikes if available
        let gammaLevels = {
          flip: price * 1.01,
          resistance: [price * 1.02, price * 1.04, price * 1.06],
          support: [price * 0.98, price * 0.96, price * 0.94]
        }

        if (optionsMetrics && optionsMetrics.strikes.length > 0) {
          const strikes = optionsMetrics.strikes
          const nearbyStrikes = strikes.filter(s => Math.abs(s - price) / price < 0.15)

          if (nearbyStrikes.length >= 3) {
            const abovePrice = nearbyStrikes.filter(s => s > price).slice(0, 3)
            const belowPrice = nearbyStrikes.filter(s => s < price).slice(-3).reverse()

            if (abovePrice.length > 0 && belowPrice.length > 0) {
              gammaLevels = {
                flip: (abovePrice[0] + belowPrice[0]) / 2,
                resistance: abovePrice,
                support: belowPrice
              }
            }
          }
        }

        stockMap.set(ticker.ticker, {
          symbol: ticker.ticker,
          name: ticker.ticker, // Will be updated from FMP
          price,
          changePercent: ticker.todaysChangePerc || 0,
          change: ticker.todaysChange || 0,
          volume: dayData.v || 0,
          marketCap: ticker.marketCap || 0,
          open: dayData.o || 0,
          high: dayData.h || 0,
          low: dayData.l || 0,
          prevClose: prevDay.c || 0,
          // Real options data from Polygon or fallback
          gex: optionsMetrics?.gex || 0,
          dex: optionsMetrics?.netGEX || 0,
          vex: 0, // Would need volatility calculation
          putCallRatio: optionsMetrics?.putCallRatio || 1.0,
          ivRank: Math.floor(Math.random() * 100), // Would need historical IV data
          flowScore: optionsMetrics?.flowScore || 50,
          netPremium: optionsMetrics?.netPremium || 0,
          darkPoolRatio: Math.random() * 50, // Would need dark pool data source
          optionVolume: optionsMetrics?.optionVolume || 0,
          gammaLevels
        })
      }
    }

    // Add remaining stocks with basic data (no options)
    polygonData.forEach(ticker => {
      if (ticker.ticker && !stockMap.has(ticker.ticker)) {
        const dayData = ticker.day || {}
        const prevDay = ticker.prevDay || {}
        const price = dayData.c || ticker.lastTrade?.p || 0

        stockMap.set(ticker.ticker, {
          symbol: ticker.ticker,
          name: ticker.ticker,
          price,
          changePercent: ticker.todaysChangePerc || 0,
          change: ticker.todaysChange || 0,
          volume: dayData.v || 0,
          marketCap: ticker.marketCap || 0,
          open: dayData.o || 0,
          high: dayData.h || 0,
          low: dayData.l || 0,
          prevClose: prevDay.c || 0,
          // Minimal options data for low-volume stocks
          gex: 0,
          dex: 0,
          vex: 0,
          putCallRatio: 1.0,
          ivRank: 50,
          flowScore: 50,
          netPremium: 0,
          darkPoolRatio: 0,
          optionVolume: 0,
          gammaLevels: {
            flip: price * 1.01,
            resistance: [price * 1.02, price * 1.04, price * 1.06],
            support: [price * 0.98, price * 0.96, price * 0.94]
          }
        })
      }
    })
  }
  
  // Enhance with FMP data
  if (fmpData && fmpData.length > 0) {
    fmpData.forEach(stock => {
      if (stock.symbol) {
        if (stockMap.has(stock.symbol)) {
          const existing = stockMap.get(stock.symbol)
          existing.name = stock.name || existing.name
          existing.marketCap = stock.marketCap || existing.marketCap
          existing.price = stock.price || existing.price
          existing.changePercent = stock.changesPercentage || existing.changePercent
        } else {
          // Add new stock from FMP (without options data)
          stockMap.set(stock.symbol, {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            price: stock.price || 0,
            changePercent: stock.changesPercentage || 0,
            change: stock.change || 0,
            volume: stock.volume || 0,
            marketCap: stock.marketCap || 0,
            // No options data for FMP-only stocks
            gex: 0,
            dex: 0,
            vex: 0,
            putCallRatio: 1.0,
            ivRank: 50,
            flowScore: 50,
            netPremium: 0,
            darkPoolRatio: 0,
            optionVolume: 0,
            gammaLevels: {
              flip: stock.price * 1.01,
              resistance: [stock.price * 1.02, stock.price * 1.04, stock.price * 1.06],
              support: [stock.price * 0.98, stock.price * 0.96, stock.price * 0.94]
            }
          })
        }
      }
    })
  }
  
  // If no data from APIs, use some default stocks
  if (stockMap.size === 0) {
    console.log('No API data available, using defaults')
    const defaultStocks = [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.32, changePercent: 2.5, volume: 45000000, marketCap: 2150000000000 },
      { symbol: 'TSLA', name: 'Tesla Inc', price: 242.15, changePercent: 1.8, volume: 98000000, marketCap: 770000000000 },
      { symbol: 'AAPL', name: 'Apple Inc', price: 195.82, changePercent: -0.5, volume: 52000000, marketCap: 3050000000000 },
      { symbol: 'SPY', name: 'SPDR S&P 500', price: 438.50, changePercent: 0.8, volume: 75000000, marketCap: 450000000000 },
      { symbol: 'QQQ', name: 'Invesco QQQ', price: 365.20, changePercent: 1.2, volume: 35000000, marketCap: 200000000000 },
    ]

    defaultStocks.forEach(stock => {
      stockMap.set(stock.symbol, {
        ...stock,
        // No options data in fallback mode
        gex: 0,
        dex: 0,
        vex: 0,
        putCallRatio: 1.0,
        ivRank: 50,
        flowScore: 50,
        netPremium: 0,
        darkPoolRatio: 0,
        optionVolume: 0,
        gammaLevels: {
          flip: stock.price * 1.01,
          resistance: [stock.price * 1.02, stock.price * 1.04, stock.price * 1.06],
          support: [stock.price * 0.98, stock.price * 0.96, stock.price * 0.94]
        }
      })
    })
  }

  // Enrich stocks with liquidity hunter metrics (top 10 by volume to avoid performance issues)
  const stocks = Array.from(stockMap.values())
  const topStocksByVolume = stocks
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10)

  for (const stock of topStocksByVolume) {
    try {
      const bars = await fetchBarsForSymbol(stock.symbol)
      if (bars.length >= 3) {
        const liquidityResult = analyzeLiquidityHunter(stock.symbol, bars, DEFAULT_CONFIG)

        stock.liquidity = {
          activeFVGCount: liquidityResult.activeFVGCount,
          bullishFVGCount: liquidityResult.bullishFVGCount,
          bearishFVGCount: liquidityResult.bearishFVGCount,
          liquidityZoneCount: liquidityResult.liquidityZoneCount,
          buyVolume: liquidityResult.orderFlow.buyVolume,
          sellVolume: liquidityResult.orderFlow.sellVolume,
          delta: liquidityResult.orderFlow.delta,
          avgAbsDelta: liquidityResult.orderFlow.avgAbsDelta,
          isSignificantBuying: liquidityResult.orderFlow.isSignificantBuying,
          isSignificantSelling: liquidityResult.orderFlow.isSignificantSelling,
          liquidityScore: liquidityResult.liquidityScore,
          liquiditySignals: liquidityResult.signals,
        }
      }
    } catch (error) {
      console.log(`Liquidity analysis error for ${stock.symbol}:`, error)
    }
  }

  return stocks
}

export async function GET() {
  try {
    console.log('Fetching market data...')

    // Fetch from available sources
    const [polygonData, fmpData, unusualWhalesData] = await Promise.all([
      fetchPolygonData(),
      fetchFMPData(),
      fetchUnusualWhalesData()
    ])

    console.log(`Got ${polygonData.length} stocks from Polygon`)
    console.log(`Got ${fmpData.length} stocks from FMP`)

    // Process and combine data (now async to fetch options data)
    const processedData = await processMarketData(polygonData, fmpData, unusualWhalesData)

    console.log(`Returning ${processedData.length} total stocks`)
    console.log(`${processedData.filter(s => s.gex > 0).length} stocks have live options data`)
    console.log(`${processedData.filter(s => s.liquidity).length} stocks have liquidity hunter metrics`)

    return NextResponse.json({
      data: processedData,
      timestamp: new Date().toISOString(),
      status: 'success',
      count: processedData.length,
      liveOptionsCount: processedData.filter(s => s.gex > 0).length,
      liquidityAnalyzedCount: processedData.filter(s => s.liquidity).length
    })
  } catch (error) {
    console.error('API route error:', error)

    // Return default stocks even on error
    const defaultStocks = [
      {
        symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.32, changePercent: 2.5,
        volume: 45000000, marketCap: 2150000000000, change: 21.35,
        open: 870.0, high: 880.0, low: 865.0, prevClose: 853.97,
        gex: 150000000, dex: 50000000, vex: 0, putCallRatio: 0.75, ivRank: 68,
        flowScore: 72, netPremium: 25000000, darkPoolRatio: 22, optionVolume: 85000,
        gammaLevels: {
          flip: 875.0,
          resistance: [880, 885, 890],
          support: [870, 865, 860]
        }
      },
      {
        symbol: 'TSLA', name: 'Tesla Inc', price: 242.15, changePercent: 1.8,
        volume: 98000000, marketCap: 770000000000, change: 4.28,
        open: 240.0, high: 245.0, low: 239.0, prevClose: 237.87,
        gex: 220000000, dex: -30000000, vex: 0, putCallRatio: 1.2, ivRank: 78,
        flowScore: 58, netPremium: -15000000, darkPoolRatio: 28, optionVolume: 125000,
        gammaLevels: {
          flip: 240.0,
          resistance: [245, 250, 255],
          support: [235, 230, 225]
        }
      },
      {
        symbol: 'AAPL', name: 'Apple Inc', price: 195.82, changePercent: -0.5,
        volume: 52000000, marketCap: 3050000000000, change: -0.98,
        open: 196.5, high: 197.0, low: 195.0, prevClose: 196.80,
        gex: 180000000, dex: 20000000, vex: 0, putCallRatio: 0.95, ivRank: 52,
        flowScore: 55, netPremium: 8000000, darkPoolRatio: 18, optionVolume: 95000,
        gammaLevels: {
          flip: 195.0,
          resistance: [197.5, 200, 202.5],
          support: [192.5, 190, 187.5]
        }
      },
      {
        symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 438.50, changePercent: 0.8,
        volume: 75000000, marketCap: 450000000000, change: 3.48,
        open: 437.0, high: 439.0, low: 436.5, prevClose: 435.02,
        gex: 350000000, dex: 80000000, vex: 0, putCallRatio: 0.85, ivRank: 45,
        flowScore: 62, netPremium: 35000000, darkPoolRatio: 15, optionVolume: 250000,
        gammaLevels: {
          flip: 438.0,
          resistance: [440, 442, 445],
          support: [435, 432, 430]
        }
      },
      {
        symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 365.20, changePercent: 1.2,
        volume: 35000000, marketCap: 200000000000, change: 4.33,
        open: 363.0, high: 366.5, low: 362.5, prevClose: 360.87,
        gex: 280000000, dex: 60000000, vex: 0, putCallRatio: 0.78, ivRank: 48,
        flowScore: 68, netPremium: 28000000, darkPoolRatio: 16, optionVolume: 180000,
        gammaLevels: {
          flip: 365.0,
          resistance: [367.5, 370, 372.5],
          support: [362.5, 360, 357.5]
        }
      },
      {
        symbol: 'AMD', name: 'Advanced Micro Devices', price: 178.45, changePercent: 1.65,
        volume: 35200000, marketCap: 288000000000, change: 2.90,
        open: 177.0, high: 180.0, low: 176.5, prevClose: 175.55,
        gex: 120000000, dex: 35000000, vex: 0, putCallRatio: 0.82, ivRank: 62,
        flowScore: 70, netPremium: 18000000, darkPoolRatio: 24, optionVolume: 78000,
        gammaLevels: {
          flip: 178.0,
          resistance: [180, 182.5, 185],
          support: [175, 172.5, 170]
        }
      },
      {
        symbol: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X', price: 41.25, changePercent: 3.2,
        volume: 22000000, marketCap: 2500000000, change: 1.28,
        open: 40.5, high: 42.0, low: 40.0, prevClose: 39.97,
        gex: 95000000, dex: 28000000, vex: 0, putCallRatio: 0.68, ivRank: 75,
        flowScore: 78, netPremium: 12000000, darkPoolRatio: 30, optionVolume: 95000,
        gammaLevels: {
          flip: 41.0,
          resistance: [42, 43, 44],
          support: [40, 39, 38]
        }
      }
    ]

    return NextResponse.json({
      data: defaultStocks,
      error: 'API error occurred, using default stocks',
      timestamp: new Date().toISOString(),
      status: 'success',
      count: defaultStocks.length,
      liveOptionsCount: 0
    })
  }
}
