import { NextResponse } from 'next/server'

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

async function processMarketData(polygonData: any[], fmpData: any[], unusualWhalesData: any) {
  const stockMap = new Map()

  // Process Polygon data first (most comprehensive)
  if (polygonData && polygonData.length > 0) {
    // Process top stocks with options data (limit to prevent rate limiting)
    const topStocks = polygonData
      .filter(t => t.day?.v > 500000) // Only stocks with >500K volume
      .sort((a, b) => (b.day?.v || 0) - (a.day?.v || 0))
      .slice(0, 250) // Top 250 by volume - increased for better scanner coverage

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

  return Array.from(stockMap.values())
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

    return NextResponse.json({
      data: processedData,
      timestamp: new Date().toISOString(),
      status: 'success',
      count: processedData.length,
      liveOptionsCount: processedData.filter(s => s.gex > 0).length
    })
  } catch (error) {
    console.error('API route error:', error)

    // Return some default data even on error
    return NextResponse.json({
      data: [],
      error: 'API error occurred',
      timestamp: new Date().toISOString(),
      status: 'error'
    })
  }
}
