import { NextResponse } from 'next/server'

/**
 * Fetch real Congressional stock trading data from Unusual Whales API
 * This tracks actual politician stock purchases and sales
 */
export async function GET(request: Request) {
  const apiKey = process.env.UNUSUAL_WHALES_KEY

  if (!apiKey) {
    console.log('No Unusual Whales API key found - using demo data')
    return NextResponse.json({
      status: 'demo',
      data: getDemoCongressData(),
      message: 'Using demo data - set UNUSUAL_WHALES_KEY for real data'
    })
  }

  try {
    // Fetch recent Congress trades from Unusual Whales
    const response = await fetch(
      'https://api.unusualwhales.com/api/stock_trades/congress',
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      console.error('UW Congress API error:', response.status)
      return NextResponse.json({
        status: 'demo',
        data: getDemoCongressData(),
        message: `API error (${response.status}) - using demo data`
      })
    }

    const rawData = await response.json()

    // Process and aggregate Congress trades by ticker
    const tradesByTicker = processCongressTrades(rawData)

    return NextResponse.json({
      status: 'live',
      data: tradesByTicker,
      timestamp: new Date().toISOString(),
      source: 'Unusual Whales'
    })

  } catch (error) {
    console.error('Congress trades error:', error)
    return NextResponse.json({
      status: 'demo',
      data: getDemoCongressData(),
      message: 'API error - using demo data'
    })
  }
}

/**
 * Process raw Congress trade data into aggregated format
 */
function processCongressTrades(rawData: any) {
  const tradesByTicker: { [ticker: string]: any } = {}

  if (!rawData || !Array.isArray(rawData)) {
    return tradesByTicker
  }

  // Aggregate trades by ticker
  rawData.forEach((trade: any) => {
    const ticker = trade.ticker || trade.symbol
    if (!ticker) return

    if (!tradesByTicker[ticker]) {
      tradesByTicker[ticker] = {
        ticker,
        netBuys: 0,
        netSells: 0,
        totalTransactions: 0,
        totalValue: 0,
        recentActivity: false,
        lastTrade: null,
        politicians: [],
        trades: []
      }
    }

    const data = tradesByTicker[ticker]
    data.totalTransactions++

    // Determine if buy or sell
    const isBuy = trade.type?.toLowerCase().includes('purchase') ||
                  trade.transaction_type?.toLowerCase().includes('purchase')

    if (isBuy) {
      data.netBuys++
    } else {
      data.netSells++
    }

    // Add value
    const amount = trade.amount || trade.value || 0
    data.totalValue += amount

    // Track politician
    const politicianName = trade.representative || trade.politician || trade.name
    if (politicianName && !data.politicians.includes(politicianName)) {
      data.politicians.push(politicianName)
    }

    // Track date
    const tradeDate = trade.transaction_date || trade.date || trade.disclosure_date
    if (tradeDate) {
      if (!data.lastTrade || new Date(tradeDate) > new Date(data.lastTrade)) {
        data.lastTrade = tradeDate
      }

      // Consider recent if within last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      if (new Date(tradeDate) > thirtyDaysAgo) {
        data.recentActivity = true
      }
    }

    // Store individual trade
    data.trades.push({
      politician: politicianName,
      type: isBuy ? 'BUY' : 'SELL',
      date: tradeDate,
      amount: amount
    })
  })

  // Sort politicians by most recent activity
  Object.values(tradesByTicker).forEach(data => {
    data.trades.sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  })

  return tradesByTicker
}

/**
 * Demo Congress data (fallback when API key not available)
 */
function getDemoCongressData() {
  return {
    'NVDA': {
      ticker: 'NVDA',
      netBuys: 8,
      netSells: 1,
      totalTransactions: 9,
      totalValue: 450000,
      recentActivity: true,
      lastTrade: '2024-01-10',
      politicians: ['Pelosi, Nancy', 'Tuberville, Tommy', 'Austin Scott', 'Dan Crenshaw', 'Josh Gottheimer'],
      trades: [
        { politician: 'Pelosi, Nancy', type: 'BUY', date: '2024-01-10', amount: 100000 },
        { politician: 'Tuberville, Tommy', type: 'BUY', date: '2024-01-09', amount: 50000 },
        { politician: 'Austin Scott', type: 'BUY', date: '2024-01-08', amount: 75000 }
      ]
    },
    'MSFT': {
      ticker: 'MSFT',
      netBuys: 6,
      netSells: 0,
      totalTransactions: 6,
      totalValue: 320000,
      recentActivity: true,
      lastTrade: '2024-01-08',
      politicians: ['Dan Crenshaw', 'Josh Gottheimer', 'Brian Higgins', 'Others'],
      trades: [
        { politician: 'Dan Crenshaw', type: 'BUY', date: '2024-01-08', amount: 80000 },
        { politician: 'Josh Gottheimer', type: 'BUY', date: '2024-01-07', amount: 60000 }
      ]
    },
    'LMT': {
      ticker: 'LMT',
      netBuys: 9,
      netSells: 0,
      totalTransactions: 9,
      totalValue: 680000,
      recentActivity: true,
      lastTrade: '2024-01-11',
      politicians: ['Defense Committee Members', 'Armed Services Committee'],
      trades: [
        { politician: 'Defense Committee Member', type: 'BUY', date: '2024-01-11', amount: 150000 },
        { politician: 'Armed Services Committee', type: 'BUY', date: '2024-01-10', amount: 120000 }
      ]
    },
    'JPM': {
      ticker: 'JPM',
      netBuys: 7,
      netSells: 0,
      totalTransactions: 7,
      totalValue: 510000,
      recentActivity: true,
      lastTrade: '2024-01-12',
      politicians: ['Financial Services Committee Members'],
      trades: [
        { politician: 'Financial Committee Member', type: 'BUY', date: '2024-01-12', amount: 90000 }
      ]
    },
    'RTX': {
      ticker: 'RTX',
      netBuys: 6,
      netSells: 0,
      totalTransactions: 6,
      totalValue: 420000,
      recentActivity: true,
      lastTrade: '2024-01-09',
      politicians: ['Defense Committee Members'],
      trades: [
        { politician: 'Defense Committee Member', type: 'BUY', date: '2024-01-09', amount: 100000 }
      ]
    },
    'UNH': {
      ticker: 'UNH',
      netBuys: 5,
      netSells: 1,
      totalTransactions: 6,
      totalValue: 380000,
      recentActivity: true,
      lastTrade: '2024-01-07',
      politicians: ['Healthcare Committee Members'],
      trades: [
        { politician: 'Healthcare Committee Member', type: 'BUY', date: '2024-01-07', amount: 85000 }
      ]
    },
    'AAPL': {
      ticker: 'AAPL',
      netBuys: 5,
      netSells: 2,
      totalTransactions: 7,
      totalValue: 290000,
      recentActivity: true,
      lastTrade: '2024-01-05',
      politicians: ['Various Members'],
      trades: [
        { politician: 'Multiple Members', type: 'BUY', date: '2024-01-05', amount: 65000 }
      ]
    },
    'V': {
      ticker: 'V',
      netBuys: 4,
      netSells: 0,
      totalTransactions: 4,
      totalValue: 240000,
      recentActivity: false,
      lastTrade: '2023-12-28',
      politicians: ['Various Members'],
      trades: [
        { politician: 'Member', type: 'BUY', date: '2023-12-28', amount: 60000 }
      ]
    },
    'MA': {
      ticker: 'MA',
      netBuys: 4,
      netSells: 0,
      totalTransactions: 4,
      totalValue: 235000,
      recentActivity: false,
      lastTrade: '2023-12-28',
      politicians: ['Various Members'],
      trades: [
        { politician: 'Member', type: 'BUY', date: '2023-12-28', amount: 58000 }
      ]
    },
    'GOOGL': {
      ticker: 'GOOGL',
      netBuys: 4,
      netSells: 1,
      totalTransactions: 5,
      totalValue: 210000,
      recentActivity: false,
      lastTrade: '2023-12-20',
      politicians: ['Multiple Members'],
      trades: [
        { politician: 'Member', type: 'BUY', date: '2023-12-20', amount: 70000 }
      ]
    },
    'TSLA': {
      ticker: 'TSLA',
      netBuys: 3,
      netSells: 4,
      totalTransactions: 7,
      totalValue: -80000,
      recentActivity: false,
      lastTrade: '2023-12-15',
      politicians: ['Mixed Sentiment'],
      trades: [
        { politician: 'Member', type: 'SELL', date: '2023-12-15', amount: 50000 }
      ]
    },
    'META': {
      ticker: 'META',
      netBuys: 3,
      netSells: 2,
      totalTransactions: 5,
      totalValue: 95000,
      recentActivity: false,
      lastTrade: '2023-12-10',
      politicians: ['Tech-focused Members'],
      trades: [
        { politician: 'Tech Committee Member', type: 'BUY', date: '2023-12-10', amount: 45000 }
      ]
    }
  }
}
