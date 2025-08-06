import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Get Unusual Whales API key
    const UW_API_KEY = process.env.UNUSUAL_WHALES_API_KEY;
    
    if (!UW_API_KEY) {
      console.error('Unusual Whales API key not found');
      // Return mock data if no API key
      return NextResponse.json({
        success: true,
        data: generateMockFlowData(limit),
        source: 'mock'
      });
    }

    console.log('🐋 Fetching real options flow from Unusual Whales...');

    // Unusual Whales endpoints
    const endpoints = {
      flow: 'https://api.unusualwhales.com/api/option-activity/flow',
      darkpool: 'https://api.unusualwhales.com/api/darkpool/flow',
      gamma: 'https://api.unusualwhales.com/api/market/gamma-exposure'
    };

    try {
      // Fetch options flow data
      const flowResponse = await fetch(endpoints.flow, {
        headers: {
          'Authorization': `Bearer ${UW_API_KEY}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 1 minute
      });

      if (!flowResponse.ok) {
        throw new Error(`UW API error: ${flowResponse.status}`);
      }

      const flowData = await flowResponse.json();
      
      // Process and enrich the data
      const processedFlow = flowData.data?.slice(0, limit).map((flow: any) => ({
        // Basic info
        symbol: flow.symbol,
        timestamp: flow.timestamp,
        
        // Contract details
        strike: flow.strike,
        expiry: flow.expiry,
        optionType: flow.option_type, // 'CALL' or 'PUT'
        
        // Flow metrics
        premium: flow.premium,
        volume: flow.volume,
        openInterest: flow.open_interest,
        volumeOIRatio: flow.volume / flow.open_interest,
        
        // Price data
        spotPrice: flow.spot_price,
        askPrice: flow.ask,
        bidPrice: flow.bid,
        midPrice: (flow.ask + flow.bid) / 2,
        
        // Greeks
        iv: flow.implied_volatility,
        delta: flow.delta,
        gamma: flow.gamma,
        
        // Flow analysis
        side: determineSide(flow),
        size: categorizeSize(flow.premium),
        unusual: flow.unusual || isUnusual(flow),
        
        // Sentiment
        sentiment: flow.sentiment || calculateSentiment(flow),
        aggressiveness: calculateAggressiveness(flow),
        
        // Additional flags
        sweep: flow.is_sweep || false,
        block: flow.is_block || false,
        spread: flow.is_spread || false,
        
        // Trade idea potential
        ideaScore: calculateIdeaScore(flow),
        riskReward: calculateRiskReward(flow),
      }));

      // Get top trade ideas based on flow
      const tradeIdeas = generateTradeIdeas(processedFlow);

      return NextResponse.json({
        success: true,
        data: processedFlow,
        tradeIdeas: tradeIdeas,
        timestamp: new Date().toISOString(),
        source: 'unusual_whales'
      });

    } catch (apiError) {
      console.error('API Error:', apiError);
      // Fallback to enhanced mock data
      return NextResponse.json({
        success: true,
        data: generateMockFlowData(limit),
        source: 'mock_enhanced'
      });
    }

  } catch (error) {
    console.error('Options flow error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function determineSide(flow: any): string {
  // Analyze if bought or sold based on price vs bid/ask
  if (flow.price >= flow.ask) return 'BUY';
  if (flow.price <= flow.bid) return 'SELL';
  return 'MID';
}

function categorizeSize(premium: number): string {
  if (premium >= 5000000) return 'WHALE';
  if (premium >= 1000000) return 'HUGE';
  if (premium >= 500000) return 'LARGE';
  if (premium >= 100000) return 'MEDIUM';
  return 'SMALL';
}

function isUnusual(flow: any): boolean {
  // Check if volume is unusually high vs OI
  const volOIRatio = flow.volume / flow.open_interest;
  const premiumSize = flow.premium > 500000;
  const highIV = flow.implied_volatility > 0.8;
  
  return volOIRatio > 5 || premiumSize || highIV;
}

function calculateSentiment(flow: any): string {
  const isCall = flow.option_type === 'CALL';
  const isBuy = flow.side === 'BUY';
  
  if (isCall && isBuy) return 'BULLISH';
  if (!isCall && isBuy) return 'BEARISH';
  if (isCall && !isBuy) return 'NEUTRAL_BEARISH';
  return 'NEUTRAL_BULLISH';
}

function calculateAggressiveness(flow: any): number {
  let score = 50;
  
  // More aggressive if buying at ask
  if (flow.price >= flow.ask) score += 20;
  // More aggressive if sweep
  if (flow.is_sweep) score += 15;
  // More aggressive if high volume
  if (flow.volume > flow.open_interest * 10) score += 15;
  
  return Math.min(100, score);
}

function calculateIdeaScore(flow: any): number {
  let score = 0;
  
  // High premium
  if (flow.premium > 1000000) score += 30;
  else if (flow.premium > 500000) score += 20;
  else if (flow.premium > 100000) score += 10;
  
  // Unusual activity
  if (flow.unusual) score += 20;
  if (flow.is_sweep) score += 15;
  
  // Good risk/reward (OTM but not too far)
  const moneyness = flow.spot_price / flow.strike;
  if (flow.option_type === 'CALL') {
    if (moneyness > 0.95 && moneyness < 1.05) score += 20;
  } else {
    if (moneyness > 0.95 && moneyness < 1.05) score += 20;
  }
  
  // Time value (not too close to expiry)
  const daysToExpiry = Math.floor((new Date(flow.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysToExpiry > 7 && daysToExpiry < 45) score += 15;
  
  return Math.min(100, score);
}

function calculateRiskReward(flow: any): string {
  const premium = flow.premium;
  const moneyness = flow.spot_price / flow.strike;
  
  if (flow.option_type === 'CALL') {
    if (moneyness < 0.95) return '1:5+'; // Far OTM
    if (moneyness < 1) return '1:3';    // OTM
    if (moneyness < 1.05) return '1:2'; // ATM/Slightly ITM
    return '1:1.5';                      // ITM
  } else {
    if (moneyness > 1.05) return '1:5+'; // Far OTM
    if (moneyness > 1) return '1:3';     // OTM
    if (moneyness > 0.95) return '1:2';  // ATM/Slightly ITM
    return '1:1.5';                       // ITM
  }
}

function generateTradeIdeas(flows: any[]): any[] {
  // Sort by idea score and get top candidates
  const topFlows = flows
    .filter(f => f.ideaScore > 60)
    .sort((a, b) => b.ideaScore - a.ideaScore)
    .slice(0, 10);
  
  return topFlows.map(flow => ({
    symbol: flow.symbol,
    type: generateTradeType(flow),
    confidence: Math.min(95, flow.ideaScore + 10),
    riskReward: flow.riskReward,
    timeframe: calculateTimeframe(flow),
    entry: generateEntry(flow),
    reasoning: generateReasoning(flow),
    targets: generateTargets(flow),
    stopLoss: generateStopLoss(flow),
    maxProfit: estimateMaxProfit(flow),
    maxLoss: estimateMaxLoss(flow),
    probability: estimateProbability(flow),
    tags: generateTags(flow)
  }));
}

function generateTradeType(flow: any): string {
  if (flow.spread) return `${flow.optionType} Spread`;
  if (flow.size === 'WHALE') return `${flow.optionType} Whale Play`;
  if (flow.sweep) return `${flow.optionType} Sweep Follow`;
  return `${flow.optionType} Flow Trade`;
}

function calculateTimeframe(flow: any): string {
  const daysToExpiry = Math.floor((new Date(flow.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysToExpiry <= 7) return '1-7 days';
  if (daysToExpiry <= 14) return '1-2 weeks';
  if (daysToExpiry <= 30) return '2-4 weeks';
  return '1-2 months';
}

function generateEntry(flow: any): any {
  return {
    buy: `Buy ${flow.strike}${flow.optionType.charAt(0)} ${new Date(flow.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    price: `Entry: $${flow.midPrice.toFixed(2)}`,
    size: 'Position size: 1-2% of portfolio'
  };
}

function generateReasoning(flow: any): string[] {
  const reasons = [];
  
  if (flow.size === 'WHALE' || flow.size === 'HUGE') {
    reasons.push(`${flow.size} size order: $${(flow.premium / 1e6).toFixed(2)}M premium`);
  }
  
  if (flow.sweep) {
    reasons.push('Sweep order detected - urgent buyer');
  }
  
  if (flow.unusual) {
    reasons.push(`Unusual activity: ${flow.volume}x normal volume`);
  }
  
  if (flow.aggressiveness > 70) {
    reasons.push('Aggressive positioning at ask price');
  }
  
  if (flow.volumeOIRatio > 5) {
    reasons.push(`High Vol/OI ratio: ${flow.volumeOIRatio.toFixed(1)}x`);
  }
  
  reasons.push(`IV: ${(flow.iv * 100).toFixed(0)}%`);
  
  return reasons;
}

function generateTargets(flow: any): string[] {
  const strike = flow.strike;
  const isCall = flow.optionType === 'CALL';
  
  if (isCall) {
    return [
      `${(strike * 1.02).toFixed(2)}`,
      `${(strike * 1.05).toFixed(2)}`,
      `${(strike * 1.10).toFixed(2)}`
    ];
  } else {
    return [
      `${(strike * 0.98).toFixed(2)}`,
      `${(strike * 0.95).toFixed(2)}`,
      `${(strike * 0.90).toFixed(2)}`
    ];
  }
}

function generateStopLoss(flow: any): string {
  const premium = flow.midPrice;
  return `Stop at 50% loss: $${(premium * 0.5).toFixed(2)}`;
}

function estimateMaxProfit(flow: any): number {
  return Math.round(flow.premium * 3); // Rough estimate
}

function estimateMaxLoss(flow: any): number {
  return Math.round(flow.premium);
}

function estimateProbability(flow: any): number {
  // Use delta as rough probability estimate
  return Math.round(Math.abs(flow.delta) * 100);
}

function generateTags(flow: any): string[] {
  const tags = [];
  
  if (flow.sweep) tags.push('sweep');
  if (flow.size === 'WHALE' || flow.size === 'HUGE') tags.push('whale_activity');
  if (flow.unusual) tags.push('unusual_activity');
  if (flow.aggressiveness > 70) tags.push('aggressive');
  if (flow.iv > 0.8) tags.push('high_iv');
  
  return tags;
}

// Generate mock data when API is not available
function generateMockFlowData(limit: number): any[] {
  const symbols = ['NVDA', 'TSLA', 'AMD', 'SPY', 'QQQ', 'AAPL', 'META', 'AMZN', 'GME', 'COIN'];
  const flows = [];
  
  for (let i = 0; i < limit; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const spotPrice = 100 + Math.random() * 400;
    const isCall = Math.random() > 0.5;
    const strike = isCall 
      ? spotPrice * (1 + Math.random() * 0.1)
      : spotPrice * (1 - Math.random() * 0.1);
    
    flows.push({
      symbol,
      timestamp: new Date().toISOString(),
      strike: Math.round(strike),
      expiry: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      optionType: isCall ? 'CALL' : 'PUT',
      premium: Math.round(Math.random() * 5000000),
      volume: Math.round(Math.random() * 10000),
      openInterest: Math.round(Math.random() * 50000),
      spotPrice,
      askPrice: 2 + Math.random() * 10,
      bidPrice: 1.5 + Math.random() * 9,
      iv: 0.3 + Math.random() * 0.7,
      delta: isCall ? Math.random() * 0.7 : -Math.random() * 0.7,
      gamma: Math.random() * 0.05,
      side: Math.random() > 0.5 ? 'BUY' : 'SELL',
      sweep: Math.random() > 0.8,
      unusual: Math.random() > 0.7,
    });
  }
  
  return flows;
}