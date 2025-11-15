import { NextResponse } from 'next/server'

/**
 * Fetch real dark pool trades from Unusual Whales API
 * Tracks institutional block trades and accumulation
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const apiKey = process.env.UNUSUAL_WHALES_KEY

  if (!apiKey) {
    return NextResponse.json({
      status: 'demo',
      data: getDemoDarkPoolData(symbol),
      message: 'Using demo data - set UNUSUAL_WHALES_KEY for real data'
    })
  }

  // Fetch dark pool data
  const endpoint = symbol
    ? `https://api.unusualwhales.com/api/darkpool/${symbol}`
    : 'https://api.unusualwhales.com/api/darkpool'

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error('UW Dark Pool API error:', response.status)
      return NextResponse.json({
        status: 'demo',
        data: getDemoDarkPoolData(symbol),
        message: `API error (${response.status}) - using demo data`
      })
    }

    const rawData = await response.json()

    // Process dark pool data
    const processedData = processDarkPoolData(rawData, symbol)

    return NextResponse.json({
      status: 'live',
      data: processedData,
      timestamp: new Date().toISOString(),
      source: 'Unusual Whales'
    })

  } catch (error) {
    console.error('Dark pool error:', error)
    return NextResponse.json({
      status: 'demo',
      data: getDemoDarkPoolData(symbol),
      message: 'API error - using demo data'
    })
  }
}

/**
 * Process raw dark pool data
 */
function processDarkPoolData(rawData: any, symbol?: string | null) {
  const trades: any[] = []

  if (!rawData) return { trades, summary: getDefaultSummary() }

  const data = Array.isArray(rawData) ? rawData : (rawData.data || [])

  data.forEach((trade: any) => {
    trades.push({
      symbol: trade.ticker || trade.symbol || symbol,
      price: trade.price || trade.trade_price,
      size: trade.size || trade.volume || trade.quantity,
      value: (trade.price || 0) * (trade.size || 0),
      timestamp: trade.time || trade.timestamp || trade.trade_time,
      exchange: trade.exchange || trade.venue || 'Dark Pool',
      isBlock: (trade.size || 0) > 10000 // Blocks are > 10k shares
    })
  })

  // Sort by timestamp (most recent first)
  trades.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Calculate summary
  const summary = calculateDarkPoolSummary(trades)

  return { trades, summary }
}

/**
 * Calculate summary statistics
 */
function calculateDarkPoolSummary(trades: any[]) {
  const totalVolume = trades.reduce((sum, t) => sum + (t.size || 0), 0)
  const totalValue = trades.reduce((sum, t) => sum + (t.value || 0), 0)
  const blockTrades = trades.filter(t => t.isBlock)
  const avgPrice = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.price || 0), 0) / trades.length
    : 0

  return {
    totalTrades: trades.length,
    totalVolume,
    totalValue,
    blockTrades: blockTrades.length,
    blockVolume: blockTrades.reduce((sum, t) => sum + (t.size || 0), 0),
    blockValue: blockTrades.reduce((sum, t) => sum + (t.value || 0), 0),
    avgPrice,
    avgSize: trades.length > 0 ? totalVolume / trades.length : 0
  }
}

/**
 * Default summary
 */
function getDefaultSummary() {
  return {
    totalTrades: 0,
    totalVolume: 0,
    totalValue: 0,
    blockTrades: 0,
    blockVolume: 0,
    blockValue: 0,
    avgPrice: 0,
    avgSize: 0
  }
}

/**
 * Demo dark pool data
 */
function getDemoDarkPoolData(symbol?: string | null) {
  const demoData: any = {
    'SPY': {
      trades: [
        { symbol: 'SPY', price: 478.50, size: 50000, value: 23925000, timestamp: '2024-01-15T14:30:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'SPY', price: 478.25, size: 25000, value: 11956250, timestamp: '2024-01-15T14:15:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'SPY', price: 478.10, size: 35000, value: 16733500, timestamp: '2024-01-15T14:00:00Z', exchange: 'Dark Pool', isBlock: true }
      ],
      summary: {
        totalTrades: 3,
        totalVolume: 110000,
        totalValue: 52614750,
        blockTrades: 3,
        blockVolume: 110000,
        blockValue: 52614750,
        avgPrice: 478.28,
        avgSize: 36667
      }
    },
    'NVDA': {
      trades: [
        { symbol: 'NVDA', price: 876.20, size: 15000, value: 13143000, timestamp: '2024-01-15T15:00:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'NVDA', price: 875.50, size: 22000, value: 19261000, timestamp: '2024-01-15T14:45:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'NVDA', price: 874.80, size: 18000, value: 15746400, timestamp: '2024-01-15T14:30:00Z', exchange: 'Dark Pool', isBlock: true }
      ],
      summary: {
        totalTrades: 3,
        totalVolume: 55000,
        totalValue: 48150400,
        blockTrades: 3,
        blockVolume: 55000,
        blockValue: 48150400,
        avgPrice: 875.50,
        avgSize: 18333
      }
    },
    'TSLA': {
      trades: [
        { symbol: 'TSLA', price: 243.10, size: 40000, value: 9724000, timestamp: '2024-01-15T15:15:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'TSLA', price: 242.80, size: 30000, value: 7284000, timestamp: '2024-01-15T15:00:00Z', exchange: 'Dark Pool', isBlock: true }
      ],
      summary: {
        totalTrades: 2,
        totalVolume: 70000,
        totalValue: 17008000,
        blockTrades: 2,
        blockVolume: 70000,
        blockValue: 17008000,
        avgPrice: 242.95,
        avgSize: 35000
      }
    },
    'AAPL': {
      trades: [
        { symbol: 'AAPL', price: 195.50, size: 28000, value: 5474000, timestamp: '2024-01-15T14:55:00Z', exchange: 'Dark Pool', isBlock: true },
        { symbol: 'AAPL', price: 195.25, size: 32000, value: 6248000, timestamp: '2024-01-15T14:40:00Z', exchange: 'Dark Pool', isBlock: true }
      ],
      summary: {
        totalTrades: 2,
        totalVolume: 60000,
        totalValue: 11722000,
        blockTrades: 2,
        blockVolume: 60000,
        blockValue: 11722000,
        avgPrice: 195.37,
        avgSize: 30000
      }
    }
  }

  if (symbol && demoData[symbol]) {
    return demoData[symbol]
  }

  // Return aggregate market-wide demo data
  const allTrades = Object.values(demoData).flatMap((d: any) => d.trades)
  return {
    trades: allTrades,
    summary: {
      totalTrades: allTrades.length,
      totalVolume: allTrades.reduce((sum: number, t: any) => sum + t.size, 0),
      totalValue: allTrades.reduce((sum: number, t: any) => sum + t.value, 0),
      blockTrades: allTrades.filter((t: any) => t.isBlock).length,
      blockVolume: allTrades.filter((t: any) => t.isBlock).reduce((sum: number, t: any) => sum + t.size, 0),
      blockValue: allTrades.filter((t: any) => t.isBlock).reduce((sum: number, t: any) => sum + t.value, 0),
      avgPrice: allTrades.reduce((sum: number, t: any) => sum + t.price, 0) / allTrades.length,
      avgSize: allTrades.reduce((sum: number, t: any) => sum + t.size, 0) / allTrades.length
    }
  }
}
