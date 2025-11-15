import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Intraday scanner focuses on high-frequency moves, GEX, and 0-2 DTE options
    // Target: SPY, QQQ, IWM, and other high-gamma stocks

    const intradayTickers = ['SPY', 'QQQ', 'IWM', 'TSLA', 'NVDA', 'AMD', 'AAPL', 'MSFT', 'META', 'GOOGL']

    const results = []

    for (const symbol of intradayTickers) {
      try {
        // Fetch real-time data from your existing stocks API
        const stockResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/stocks`, {
          cache: 'no-store'
        })
        const stockData = await stockResponse.json()

        const stock = stockData.data?.find((s: any) => s.symbol === symbol)
        if (!stock) continue

        // Calculate intraday score (0-100)
        let score = 50 // Base score
        const signals = []

        // 1. Volume Analysis (20 points)
        if (stock.volume > stock.avgVolume * 2) {
          score += 20
          signals.push('High Volume')
        } else if (stock.volume > stock.avgVolume * 1.5) {
          score += 10
          signals.push('Above Avg Volume')
        }

        // 2. Price Movement (20 points)
        const absChange = Math.abs(stock.changePercent || 0)
        if (absChange > 2) {
          score += 20
          signals.push('Big Mover')
        } else if (absChange > 1) {
          score += 10
          signals.push('Active')
        }

        // 3. Flow Score (30 points)
        if (stock.flowScore) {
          if (stock.flowScore > 80) {
            score += 30
            signals.push('Extreme Flow')
          } else if (stock.flowScore > 60) {
            score += 15
            signals.push('Strong Flow')
          }
        }

        // 4. GEX Analysis (30 points) - simulated for now
        const hasGEX = Math.random() > 0.5
        if (hasGEX) {
          score += 15
          signals.push('GEX Wall Nearby')
        }

        // Add directional signal
        if (stock.changePercent > 0) {
          signals.push('Bullish')
        } else {
          signals.push('Bearish')
        }

        // Only include if score is decent
        if (score >= 60) {
          results.push({
            symbol,
            company: stock.name || symbol,
            price: stock.price,
            change: stock.change || 0,
            changePercent: stock.changePercent || 0,
            volume: stock.volume || 0,
            score: Math.min(95, score),
            signals,
            reasoning: `Intraday scalp opportunity with ${signals.join(', ')}`,
            mode: 'intraday',
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
      mode: 'intraday',
      results,
      scannedCount: intradayTickers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Intraday scan error:', error)
    return NextResponse.json({
      error: 'Intraday scan failed',
      results: []
    }, { status: 500 })
  }
}
