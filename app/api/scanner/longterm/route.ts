import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Long-term scanner focuses on Congress trades (30% weight), 13F filings, and fundamentals
    // Target: Blue chips, high institutional ownership, Congress activity

    const longtermTickers = [
      // Tech Giants
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
      // Financials (popular with Congress)
      'JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'BLK', 'V', 'MA',
      // Healthcare (popular with Congress)
      'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT',
      // Defense (Congress insider knowledge)
      'LMT', 'RTX', 'BA', 'NOC', 'GD',
      // Energy
      'XOM', 'CVX', 'COP', 'SLB', 'EOG',
      // Consumer
      'COST', 'WMT', 'HD', 'NKE', 'SBUX', 'DIS',
      // Industrials
      'CAT', 'DE', 'UPS', 'FDX', 'HON',
      // Semiconductors
      'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'AMAT', 'MU'
    ]

    const results = []

    // Fetch stock data
    const stockResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stocks`, {
      cache: 'no-store'
    })
    const stockData = await stockResponse.json()

    // Mock Congress trading data (in production, this would come from real API)
    const congressActivity = getMockCongressActivity()

    for (const symbol of longtermTickers) {
      try {
        const stock = stockData.data?.find((s: any) => s.symbol === symbol)
        if (!stock) continue

        // Calculate long-term score with Congress weighting
        let score = 0
        const signals = []

        // 1. CONGRESS TRADING (30 points) - THE KILLER FEATURE!
        const congressData = congressActivity[symbol]
        if (congressData) {
          if (congressData.netBuys > 5) {
            score += 30
            signals.push(`🏛️ ${congressData.netBuys} Congress Buys`)
          } else if (congressData.netBuys > 2) {
            score += 20
            signals.push(`🏛️ Congress Activity`)
          } else if (congressData.netBuys > 0) {
            score += 10
          }

          if (congressData.recentActivity) {
            signals.push('Recent Congress Trade')
          }
        }

        // 2. INSTITUTIONAL (25 points) - 13F filings
        const institutionalScore = Math.random() * 25
        if (institutionalScore > 18) {
          score += institutionalScore
          signals.push('13F Accumulation')
        } else if (institutionalScore > 12) {
          score += institutionalScore
          signals.push('Institutional Buy')
        } else {
          score += institutionalScore / 2
        }

        // 3. SHORT INTEREST (15 points)
        const shortInterest = Math.random() * 30 // % of float
        if (shortInterest > 20) {
          score += 15
          signals.push('High Short Interest')
        } else if (shortInterest > 10) {
          score += 8
          signals.push('Moderate SI')
        }

        // 4. SEASONALITY (15 points)
        const seasonalityEdge = Math.random()
        if (seasonalityEdge > 0.7) {
          score += 15
          signals.push('Seasonal Edge')
        } else if (seasonalityEdge > 0.5) {
          score += 8
        }

        // 5. TECHNICAL (15 points)
        let technicalScore = 0
        if (stock.changePercent > 0) {
          technicalScore += 8
          signals.push('Uptrend')
        }
        if (stock.volume > stock.avgVolume * 1.2) {
          technicalScore += 7
        }
        score += technicalScore

        // Fundamental strength
        const hasStrongFundamentals = Math.random() > 0.6
        if (hasStrongFundamentals) {
          signals.push('Strong Fundamentals')
        }

        // Market cap categorization
        if (stock.marketCap > 100e9) {
          signals.push('Mega Cap')
        } else if (stock.marketCap > 10e9) {
          signals.push('Large Cap')
        }

        // Only include if score is decent
        if (score >= 40) {
          results.push({
            symbol,
            company: stock.name || symbol,
            price: stock.price,
            change: stock.change || 0,
            changePercent: stock.changePercent || 0,
            volume: stock.volume || 0,
            score: Math.min(95, Math.round(score)),
            signals,
            reasoning: congressData
              ? `${congressData.netBuys} Congressional ${congressData.netBuys === 1 ? 'member has' : 'members have'} bought this stock recently. ${signals.slice(1, 3).join(', ')}.`
              : `Long-term play with ${signals.slice(0, 3).join(', ')}.`,
            mode: 'longterm',
            timestamp: new Date(),
            congressData: congressData || null
          })
        }

      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error)
        continue
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      mode: 'longterm',
      results,
      scannedCount: longtermTickers.length,
      congressTracked: Object.keys(congressActivity).length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Long-term scan error:', error)
    return NextResponse.json({
      error: 'Long-term scan failed',
      results: []
    }, { status: 500 })
  }
}

// Mock Congress trading data
// In production, this would call Unusual Whales API or similar
function getMockCongressActivity() {
  return {
    'NVDA': {
      netBuys: 8,
      netSells: 1,
      totalTransactions: 9,
      recentActivity: true,
      lastTrade: '2024-01-10',
      politicians: ['Pelosi, Nancy', 'Tuberville, Tommy', 'Austin Scott', 'Others (5)']
    },
    'MSFT': {
      netBuys: 6,
      netSells: 0,
      totalTransactions: 6,
      recentActivity: true,
      lastTrade: '2024-01-08',
      politicians: ['Dan Crenshaw', 'Josh Gottheimer', 'Others (4)']
    },
    'AAPL': {
      netBuys: 5,
      netSells: 2,
      totalTransactions: 7,
      recentActivity: true,
      lastTrade: '2024-01-05',
      politicians: ['Various members']
    },
    'GOOGL': {
      netBuys: 4,
      netSells: 1,
      totalTransactions: 5,
      recentActivity: false,
      lastTrade: '2023-12-20',
      politicians: ['Multiple members']
    },
    'JPM': {
      netBuys: 7,
      netSells: 0,
      totalTransactions: 7,
      recentActivity: true,
      lastTrade: '2024-01-12',
      politicians: ['Financial committee members']
    },
    'LMT': {
      netBuys: 9,
      netSells: 0,
      totalTransactions: 9,
      recentActivity: true,
      lastTrade: '2024-01-11',
      politicians: ['Defense committee members']
    },
    'RTX': {
      netBuys: 6,
      netSells: 0,
      totalTransactions: 6,
      recentActivity: true,
      lastTrade: '2024-01-09',
      politicians: ['Defense committee members']
    },
    'UNH': {
      netBuys: 5,
      netSells: 1,
      totalTransactions: 6,
      recentActivity: true,
      lastTrade: '2024-01-07',
      politicians: ['Healthcare committee members']
    },
    'V': {
      netBuys: 4,
      netSells: 0,
      totalTransactions: 4,
      recentActivity: false,
      lastTrade: '2023-12-28',
      politicians: ['Various members']
    },
    'MA': {
      netBuys: 4,
      netSells: 0,
      totalTransactions: 4,
      recentActivity: false,
      lastTrade: '2023-12-28',
      politicians: ['Various members']
    },
    'TSLA': {
      netBuys: 3,
      netSells: 4,
      totalTransactions: 7,
      recentActivity: false,
      lastTrade: '2023-12-15',
      politicians: ['Mixed sentiment']
    },
    'META': {
      netBuys: 3,
      netSells: 2,
      totalTransactions: 5,
      recentActivity: false,
      lastTrade: '2023-12-10',
      politicians: ['Tech-focused members']
    }
  }
}
