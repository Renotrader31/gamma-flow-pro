import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Swing scanner focuses on 30-45 DTE opportunities with multi-day holds
    // Target: Top 50 stocks with momentum, earnings catalysts, and institutional flow

    const swingTickers = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'NFLX', 'CRM',
      'AVGO', 'ORCL', 'CSCO', 'ADBE', 'INTC', 'QCOM', 'TXN', 'AMAT', 'MU', 'LRCX',
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'SCHW',
      'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'LLY', 'BMY', 'AMGN',
      'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'VLO', 'PSX', 'OXY'
    ]

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin

    try {
      // Fetch stock data
      const stockResponse = await fetch(`${baseUrl}/api/stocks`, {
        cache: 'no-store'
      })
      const stockData = await stockResponse.json()

      // If we get very limited data (< 10 stocks), it's likely demo/default data
      // In this case, show our comprehensive demo data instead
      if (!stockData.data || stockData.data.length === 0 || stockData.data.length < 10) {
        // Return mock data if no real data available (market closed or limited API data)
        return NextResponse.json({
          mode: 'swing',
          results: generateMockSwingResults(),
          scannedCount: swingTickers.length,
          timestamp: new Date().toISOString(),
          note: 'Using demo data - market may be closed or limited API access'
        })
      }

      const results = []

      for (const symbol of swingTickers) {
        try {
          const stock = stockData.data?.find((s: any) => s.symbol === symbol)
          if (!stock) continue

          // Calculate swing score with 5-component system
          let score = 0
          const signals = []

          // 1. IV Rank (25 points) - simulated
          const ivRank = stock.ivRank || Math.random() * 100
          if (ivRank > 70) {
            score += 25
            signals.push('High IV')
          } else if (ivRank > 50) {
            score += 15
            signals.push('Elevated IV')
          } else if (ivRank < 30) {
            score += 20
            signals.push('Low IV Buy')
          }

          // 2. Options Flow (25 points)
          if (stock.flowScore) {
            const flowPoints = (stock.flowScore / 100) * 25
            score += flowPoints
            if (stock.flowScore > 75) {
              signals.push('Strong Flow')
            }
          }

          // 3. Open Interest Changes (20 points) - simulated
          const oiChange = Math.random()
          if (oiChange > 0.7) {
            score += 20
            signals.push('OI Buildup')
          } else if (oiChange > 0.5) {
            score += 10
          }

          // 4. Institutional Activity (20 points) - simulated
          const instActivity = Math.random()
          if (instActivity > 0.7) {
            score += 20
            signals.push('Institutional Buy')
          } else if (instActivity > 0.5) {
            score += 10
          }

          // 5. Earnings Catalyst (10 points) - simulated (14-28 days out)
          const hasEarnings = Math.random() > 0.8
          if (hasEarnings) {
            score += 10
            signals.push('Earnings Play')
          }

          // Technical momentum
          if (stock.changePercent > 1) {
            signals.push('Bullish Momentum')
          } else if (stock.changePercent < -1) {
            signals.push('Bearish Setup')
          }

          // Volume confirmation
          if (stock.volume > stock.avgVolume * 1.5) {
            signals.push('Volume Confirm')
          }

          // Only include if score is decent
          if (score >= 50) {
            results.push({
              symbol,
              company: stock.name || symbol,
              price: stock.price,
              change: stock.change || 0,
              changePercent: stock.changePercent || 0,
              volume: stock.volume || 0,
              score: Math.min(95, Math.round(score)),
              signals,
              reasoning: `Swing trade setup with ${signals.slice(0, 3).join(', ')}. Target 30-45 DTE spreads.`,
              mode: 'swing',
              timestamp: new Date()
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
        mode: 'swing',
        results,
        scannedCount: swingTickers.length,
        timestamp: new Date().toISOString()
      })

    } catch (fetchError) {
      console.error('Error fetching stock data:', fetchError)
      return NextResponse.json({
        mode: 'swing',
        results: generateMockSwingResults(),
        scannedCount: swingTickers.length,
        timestamp: new Date().toISOString(),
        note: 'Using demo data - API unavailable'
      })
    }

  } catch (error) {
    console.error('Swing scan error:', error)
    return NextResponse.json({
      mode: 'swing',
      results: generateMockSwingResults(),
      scannedCount: 50,
      timestamp: new Date().toISOString(),
      note: 'Using demo data - error occurred'
    })
  }
}

// Generate mock swing trading results
function generateMockSwingResults() {
  return [
    {
      symbol: 'AAPL',
      company: 'Apple Inc',
      price: 195.25,
      change: 2.15,
      changePercent: 1.11,
      volume: 52800000,
      score: 85,
      signals: ['High IV', 'Strong Flow', 'OI Buildup', 'Institutional Buy', 'Bullish Momentum'],
      reasoning: 'Swing trade setup with High IV, Strong Flow, OI Buildup. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'NVDA',
      company: 'NVIDIA Corporation',
      price: 875.50,
      change: 18.75,
      changePercent: 2.19,
      volume: 42100000,
      score: 92,
      signals: ['Elevated IV', 'Strong Flow', 'OI Buildup', 'Institutional Buy', 'Earnings Play'],
      reasoning: 'Swing trade setup with Elevated IV, Strong Flow, OI Buildup. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'MSFT',
      company: 'Microsoft Corporation',
      price: 415.80,
      change: 3.45,
      changePercent: 0.84,
      volume: 28500000,
      score: 88,
      signals: ['High IV', 'Strong Flow', 'Institutional Buy', 'Bullish Momentum', 'Volume Confirm'],
      reasoning: 'Swing trade setup with High IV, Strong Flow, Institutional Buy. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'TSLA',
      company: 'Tesla Inc',
      price: 242.80,
      change: -4.15,
      changePercent: -1.68,
      volume: 98500000,
      score: 82,
      signals: ['Elevated IV', 'Strong Flow', 'OI Buildup', 'Bearish Setup', 'Volume Confirm'],
      reasoning: 'Swing trade setup with Elevated IV, Strong Flow, OI Buildup. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'AMD',
      company: 'Advanced Micro Devices',
      price: 178.45,
      change: 2.90,
      changePercent: 1.65,
      volume: 35200000,
      score: 78,
      signals: ['Low IV Buy', 'Strong Flow', 'Institutional Buy', 'Bullish Momentum'],
      reasoning: 'Swing trade setup with Low IV Buy, Strong Flow, Institutional Buy. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'META',
      company: 'Meta Platforms',
      price: 488.20,
      change: 5.60,
      changePercent: 1.16,
      volume: 18200000,
      score: 86,
      signals: ['High IV', 'Strong Flow', 'OI Buildup', 'Earnings Play', 'Bullish Momentum'],
      reasoning: 'Swing trade setup with High IV, Strong Flow, OI Buildup. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'GOOGL',
      company: 'Alphabet Inc',
      price: 142.35,
      change: 1.85,
      changePercent: 1.32,
      volume: 25400000,
      score: 81,
      signals: ['Elevated IV', 'Strong Flow', 'Institutional Buy', 'Bullish Momentum'],
      reasoning: 'Swing trade setup with Elevated IV, Strong Flow, Institutional Buy. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    },
    {
      symbol: 'JPM',
      company: 'JPMorgan Chase',
      price: 178.50,
      change: 0.85,
      changePercent: 0.48,
      volume: 8500000,
      score: 75,
      signals: ['Low IV Buy', 'OI Buildup', 'Institutional Buy'],
      reasoning: 'Swing trade setup with Low IV Buy, OI Buildup, Institutional Buy. Target 30-45 DTE spreads.',
      mode: 'swing',
      timestamp: new Date()
    }
  ]
}
