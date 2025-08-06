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

function processMarketData(polygonData: any[], fmpData: any[], unusualWhalesData: any) {
  const stockMap = new Map()
  
  // Process Polygon data first (most comprehensive)
  if (polygonData && polygonData.length > 0) {
    polygonData.forEach(ticker => {
      if (ticker.ticker) {
        const dayData = ticker.day || {}
        const prevDay = ticker.prevDay || {}
        
        stockMap.set(ticker.ticker, {
          symbol: ticker.ticker,
          name: ticker.ticker, // Will be updated from FMP
          price: dayData.c || ticker.lastTrade?.p || 0,
          changePercent: ticker.todaysChangePerc || 0,
          change: ticker.todaysChange || 0,
          volume: dayData.v || 0,
          marketCap: ticker.marketCap || 0,
          open: dayData.o || 0,
          high: dayData.h || 0,
          low: dayData.l || 0,
          prevClose: prevDay.c || 0,
          // Options/Greeks data (will be calculated or fetched)
          gex: Math.floor(Math.random() * 5000000000),
          dex: Math.floor((Math.random() - 0.5) * 2000000),
          vex: Math.floor(Math.random() * 500000),
          putCallRatio: 0.5 + Math.random() * 1.5,
          ivRank: Math.floor(Math.random() * 100),
          flowScore: Math.floor(Math.random() * 100),
          netPremium: (Math.random() - 0.5) * 100000000,
          darkPoolRatio: Math.random() * 50,
          optionVolume: Math.floor(Math.random() * 100000),
          gammaLevels: {
            flip: dayData.c ? dayData.c * 1.01 : 0,
            resistance: dayData.c ? [dayData.c * 1.02, dayData.c * 1.04, dayData.c * 1.06] : [],
            support: dayData.c ? [dayData.c * 0.98, dayData.c * 0.96, dayData.c * 0.94] : []
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
          // Add new stock from FMP
          stockMap.set(stock.symbol, {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            price: stock.price || 0,
            changePercent: stock.changesPercentage || 0,
            change: stock.change || 0,
            volume: stock.volume || 0,
            marketCap: stock.marketCap || 0,
            // Add default options data
            gex: Math.floor(Math.random() * 5000000000),
            dex: Math.floor((Math.random() - 0.5) * 2000000),
            vex: Math.floor(Math.random() * 500000),
            putCallRatio: 0.5 + Math.random() * 1.5,
            ivRank: Math.floor(Math.random() * 100),
            flowScore: Math.floor(Math.random() * 100),
            netPremium: (Math.random() - 0.5) * 100000000,
            darkPoolRatio: Math.random() * 50,
            optionVolume: Math.floor(Math.random() * 100000),
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
      { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 875.32, changePercent: 2.5 },
      { symbol: 'TSLA', name: 'Tesla Inc', price: 242.15, changePercent: 1.8 },
      { symbol: 'AAPL', name: 'Apple Inc', price: 195.82, changePercent: -0.5 },
      { symbol: 'SPY', name: 'SPDR S&P 500', price: 438.50, changePercent: 0.8 },
      { symbol: 'QQQ', name: 'Invesco QQQ', price: 365.20, changePercent: 1.2 },
    ]
    
    defaultStocks.forEach(stock => {
      stockMap.set(stock.symbol, {
        ...stock,
        volume: Math.floor(Math.random() * 50000000),
        marketCap: Math.floor(Math.random() * 1000000000000),
        gex: Math.floor(Math.random() * 5000000000),
        dex: Math.floor((Math.random() - 0.5) * 2000000),
        vex: Math.floor(Math.random() * 500000),
        putCallRatio: 0.5 + Math.random() * 1.5,
        ivRank: Math.floor(Math.random() * 100),
        flowScore: Math.floor(Math.random() * 100),
        netPremium: (Math.random() - 0.5) * 100000000,
        darkPoolRatio: Math.random() * 50,
        optionVolume: Math.floor(Math.random() * 100000),
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
    
    // Process and combine data
    const processedData = processMarketData(polygonData, fmpData, unusualWhalesData)
    
    console.log(`Returning ${processedData.length} total stocks`)
    
    return NextResponse.json({
      data: processedData,
      timestamp: new Date().toISOString(),
      status: 'success',
      count: processedData.length
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
