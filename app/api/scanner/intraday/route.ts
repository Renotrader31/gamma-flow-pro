import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Intraday scanner focuses on high-frequency moves, GEX, and 0-2 DTE options
    // Target: SPY, QQQ, IWM, and other high-gamma stocks

    const intradayTickers = ['SPY', 'QQQ', 'IWM', 'TSLA', 'NVDA', 'AMD', 'AAPL', 'MSFT', 'META', 'GOOGL']

    const results = []

    // Get the base URL from the request
    const baseUrl = new URL(request.url).origin

    try {
      // Fetch real-time data from your existing stocks API
      const stockResponse = await fetch(`${baseUrl}/api/stocks`, {
        cache: 'no-store'
      })
      const stockData = await stockResponse.json()

      // If we get very limited data (< 10 stocks), it's likely demo/default data
      // In this case, show our comprehensive demo data instead
      if (!stockData.data || stockData.data.length === 0 || stockData.data.length < 10) {
        // Return mock data if no real data available (market closed or limited API data)
        return NextResponse.json({
          mode: 'intraday',
          results: generateMockIntradayResults(),
          scannedCount: intradayTickers.length,
          timestamp: new Date().toISOString(),
          note: 'Using demo data - market may be closed or limited API access'
        })
      }

      // Fetch additional data in parallel for better scoring
      const enhancedStockData = await Promise.all(
        intradayTickers.map(async (symbol) => {
          const stock = stockData.data?.find((s: any) => s.symbol === symbol)
          if (!stock) return null

          // Fetch flow and GEX data for this symbol
          try {
            const [flowResponse, gexResponse] = await Promise.all([
              fetch(`${baseUrl}/api/unusual-flow?symbol=${symbol}`, { cache: 'no-store' }).catch(() => null),
              fetch(`${baseUrl}/api/gex-live?symbol=${symbol}`, { cache: 'no-store' }).catch(() => null)
            ])

            let flowData = null
            let gexData = null
            let flowStatus = 'demo'
            let gexStatus = 'demo'

            if (flowResponse) {
              const flowJson = await flowResponse.json()
              flowData = flowJson.data
              flowStatus = flowJson.status || 'demo'
            }

            if (gexResponse) {
              const gexJson = await gexResponse.json()
              gexData = gexJson.data
              gexStatus = gexJson.status || 'demo'
            }

            return { ...stock, flowData, gexData, flowStatus, gexStatus }
          } catch (error) {
            return stock
          }
        })
      )

      // Check if we got any live data
      const hasLiveFlow = enhancedStockData.some(s => s && s.flowStatus === 'live')
      const hasLiveGEX = enhancedStockData.some(s => s && s.gexStatus === 'live')

      for (const stockWithData of enhancedStockData) {
        if (!stockWithData) continue
        const stock = stockWithData

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

        // 3. Flow Score (30 points) - NOW USING REAL DATA!
        if (stock.flowData && stock.flowData.summary) {
          const flowScore = stock.flowData.summary.flowScore || 0
          if (flowScore > 80) {
            score += 30
            signals.push('Extreme Flow')
            console.log(`✅ ${stock.symbol}: Real flow score ${flowScore}`)
          } else if (flowScore > 60) {
            score += 15
            signals.push('Strong Flow')
            console.log(`✅ ${stock.symbol}: Real flow score ${flowScore}`)
          }

          // Add sentiment signal
          if (stock.flowData.summary.sentiment) {
            signals.push(stock.flowData.summary.sentiment === 'BULLISH' ? 'Bullish Flow' : 'Bearish Flow')
          }
        } else if (stock.flowScore) {
          // Fallback to stock data flow score
          if (stock.flowScore > 80) {
            score += 30
            signals.push('Extreme Flow')
          } else if (stock.flowScore > 60) {
            score += 15
            signals.push('Strong Flow')
          }
        }

        // 4. GEX Analysis (30 points) - NOW USING REAL DATA!
        if (stock.gexData && stock.gexData.gammaFlip) {
          const currentPrice = stock.price
          const gammaFlip = stock.gexData.gammaFlip.strike

          // Check if price is near gamma flip (within 2%)
          const distanceFromFlip = Math.abs(currentPrice - gammaFlip) / currentPrice
          if (distanceFromFlip < 0.02) {
            score += 20
            signals.push('At Gamma Flip')
            console.log(`✅ ${stock.symbol}: At gamma flip ${gammaFlip}`)
          } else if (distanceFromFlip < 0.05) {
            score += 10
            signals.push('Near Gamma Flip')
          }

          // Check for resistance/support walls
          if (stock.gexData.resistance && stock.gexData.resistance.length > 0) {
            const nearestResistance = stock.gexData.resistance[0]
            const distanceToResistance = Math.abs(currentPrice - nearestResistance.strike) / currentPrice
            if (distanceToResistance < 0.03) {
              score += 10
              signals.push('GEX Resistance Nearby')
            }
          }
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
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score)

      return NextResponse.json({
        mode: 'intraday',
        results,
        scannedCount: intradayTickers.length,
        timestamp: new Date().toISOString(),
        note: (hasLiveFlow && hasLiveGEX)
          ? '✅ Using LIVE flow & GEX data from Unusual Whales!'
          : (hasLiveFlow || hasLiveGEX)
          ? `⚠️ Partial live data (${hasLiveFlow ? 'Flow' : 'GEX'} live, ${!hasLiveFlow ? 'Flow' : 'GEX'} demo)`
          : '📊 Using demo data - add UNUSUAL_WHALES_KEY for live data'
      })

    } catch (fetchError) {
      console.error('Error fetching stock data:', fetchError)
      // Return mock data on error
      return NextResponse.json({
        mode: 'intraday',
        results: generateMockIntradayResults(),
        scannedCount: 10,
        timestamp: new Date().toISOString(),
        note: 'Using demo data - API unavailable'
      })
    }

  } catch (error) {
    console.error('Intraday scan error:', error)
    return NextResponse.json({
      mode: 'intraday',
      results: generateMockIntradayResults(),
      scannedCount: 10,
      timestamp: new Date().toISOString(),
      note: 'Using demo data - error occurred'
    })
  }
}

// Generate mock data for when market is closed or API fails
function generateMockIntradayResults() {
  return [
    {
      symbol: 'SPY',
      company: 'SPDR S&P 500 ETF',
      price: 478.25,
      change: 3.82,
      changePercent: 0.81,
      volume: 85420000,
      score: 88,
      signals: ['High Volume', 'Big Mover', 'Extreme Flow', 'Bullish'],
      reasoning: 'Intraday scalp opportunity with High Volume, Big Mover, Extreme Flow, Bullish',
      mode: 'intraday',
      timestamp: new Date()
    },
    {
      symbol: 'QQQ',
      company: 'Invesco QQQ Trust',
      price: 412.50,
      change: 4.20,
      changePercent: 1.03,
      volume: 52300000,
      score: 85,
      signals: ['Above Avg Volume', 'Big Mover', 'Strong Flow', 'Bullish'],
      reasoning: 'Intraday scalp opportunity with Above Avg Volume, Big Mover, Strong Flow, Bullish',
      mode: 'intraday',
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
      signals: ['High Volume', 'Big Mover', 'Extreme Flow', 'GEX Wall Nearby', 'Bullish'],
      reasoning: 'Intraday scalp opportunity with High Volume, Big Mover, Extreme Flow, GEX Wall Nearby, Bullish',
      mode: 'intraday',
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
      signals: ['High Volume', 'Big Mover', 'Strong Flow', 'Bearish'],
      reasoning: 'Intraday scalp opportunity with High Volume, Big Mover, Strong Flow, Bearish',
      mode: 'intraday',
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
      signals: ['Above Avg Volume', 'Big Mover', 'GEX Wall Nearby', 'Bullish'],
      reasoning: 'Intraday scalp opportunity with Above Avg Volume, Big Mover, GEX Wall Nearby, Bullish',
      mode: 'intraday',
      timestamp: new Date()
    },
    {
      symbol: 'AAPL',
      company: 'Apple Inc',
      price: 195.25,
      change: -1.05,
      changePercent: -0.54,
      volume: 52800000,
      score: 72,
      signals: ['Above Avg Volume', 'Active', 'Strong Flow', 'Bearish'],
      reasoning: 'Intraday scalp opportunity with Above Avg Volume, Active, Strong Flow, Bearish',
      mode: 'intraday',
      timestamp: new Date()
    }
  ]
}
