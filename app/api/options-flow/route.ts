import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  }
  
  try {
    const response = await fetch(
      `https://api.unusualwhales.com/api/stock/${symbol}/options-flow`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_KEY}`
        }
      }
    )
    
    const data = await response.json()
    
    const tradeIdeas = generateTradeIdeas(symbol, data)
    
    return NextResponse.json({
      symbol,
      flow: data,
      tradeIdeas,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Options flow error:', error)
    return NextResponse.json({
      error: 'Failed to fetch options flow',
      symbol
    }, { status: 500 })
  }
}

function generateTradeIdeas(symbol: string, flowData: any) {
  const ideas = []
  
  if (flowData.bullishFlow > flowData.bearishFlow * 1.5) {
    ideas.push({
      symbol,
      type: 'Bull Call Spread',
      confidence: Math.min(95, 70 + flowData.flowScore / 4),
      reasoning: 'Strong bullish flow detected',
      entry: flowData.suggestedStrikes,
      riskReward: '1:3'
    })
  }
  
  if (flowData.ivRank > 70) {
    ideas.push({
      symbol,
      type: 'Iron Condor',
      confidence: 80,
      reasoning: 'High IV rank suggests premium selling',
      entry: flowData.suggestedCondor,
      riskReward: '1:2'
    })
  }
  
  return ideas
}
