/**
 * Enhanced AI Trade Ideas API
 * Generates real trade recommendations based on:
 * - Polygon: Price, technicals, options chain
 * - Unusual Whales: Options flow, sentiment
 * - ORTEX: Short interest, squeeze potential
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeStock,
  fetchPolygonQuote,
  fetchUWFlow,
  fetchOrtexShortData,
  type EnhancedStockAnalysis
} from '@/app/lib/enhanced-api-services';

interface TradeIdea {
  id: number;
  symbol: string;
  type: string;
  confidence: number;
  riskReward: string;
  timeframe: string;
  entry: {
    action: string;
    price?: number;
    strike?: number;
    expiry?: string;
    premium?: number;
    note: string;
  };
  reasoning: string[];
  targets: string[];
  stopLoss: string;
  maxProfit: string;
  maxLoss: string;
  probability: number;
  tags: string[];
  dataSource: string[];
}

// Default symbols to scan for trade ideas
const DEFAULT_SCAN_SYMBOLS = [
  'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD', 'META',
  'GOOGL', 'AMZN', 'NFLX', 'COIN', 'GME', 'AMC', 'PLTR', 'SOFI'
];

function generateTradeIdea(analysis: EnhancedStockAnalysis): TradeIdea | null {
  const { symbol, price, overallSentiment, confidenceScore, signals, optionsFlow, shortData, tradeSetup } = analysis;
  
  if (!tradeSetup || confidenceScore < 40) {
    return null; // Not enough conviction
  }

  const timestamp = Date.now();
  const dataSources: string[] = ['Polygon'];
  if (optionsFlow) dataSources.push('Unusual Whales');
  if (shortData) dataSources.push('ORTEX');

  // Determine trade type based on setup
  let type: string;
  let entry: TradeIdea['entry'];
  let targets: string[];
  let stopLoss: string;
  let maxProfit: string;
  let maxLoss: string;
  let probability: number;
  let timeframe: string;
  let riskReward: string;
  let tags: string[];

  const isBullish = overallSentiment === 'strong_bullish' || overallSentiment === 'bullish';
  const isSqueezePlay = shortData && shortData.squeeze_score >= 70;
  const hasUnusualFlow = optionsFlow?.unusualActivity;

  if (isSqueezePlay && isBullish) {
    // SQUEEZE PLAY
    type = 'Squeeze Play - Long Calls';
    const strikePrice = roundToStrike(price * 1.05, price);
    const expiry = getExpiryDate(30);
    
    entry = {
      action: `Buy ${strikePrice}C ${expiry}`,
      strike: strikePrice,
      expiry,
      premium: Math.round(price * 0.03 * 100) / 100,
      note: `Enter on pullback to $${(price * 0.98).toFixed(2)} or breakout above $${(price * 1.02).toFixed(2)}`
    };
    targets = [
      (price * 1.10).toFixed(2),
      (price * 1.20).toFixed(2),
      (price * 1.35).toFixed(2)
    ];
    stopLoss = (price * 0.92).toFixed(2);
    maxProfit = `${((price * 0.35) / (price * 0.03) * 100).toFixed(0)}%`;
    maxLoss = '100% of premium';
    probability = Math.min(confidenceScore + 10, 85);
    timeframe = '1-4 weeks';
    riskReward = '1:5+';
    tags = ['squeeze', 'momentum', 'high-risk', 'high-reward'];

  } else if (hasUnusualFlow && isBullish) {
    // UNUSUAL FLOW MOMENTUM
    type = 'Call Spread (Unusual Flow)';
    const buyStrike = roundToStrike(price * 1.02, price);
    const sellStrike = roundToStrike(price * 1.10, price);
    const expiry = getExpiryDate(21);
    
    entry = {
      action: `Buy ${buyStrike}/${sellStrike} Call Spread ${expiry}`,
      strike: buyStrike,
      expiry,
      premium: Math.round(price * 0.015 * 100) / 100,
      note: `Unusual call activity detected - $${((optionsFlow?.callPremium || 0) / 1000000).toFixed(1)}M in call premium`
    };
    targets = [
      (price * 1.05).toFixed(2),
      (price * 1.08).toFixed(2),
      (price * 1.10).toFixed(2)
    ];
    stopLoss = (price * 0.96).toFixed(2);
    maxProfit = `$${(sellStrike - buyStrike) * 100 - (price * 0.015 * 100)}`;
    maxLoss = `$${Math.round(price * 0.015 * 100)}`;
    probability = Math.min(confidenceScore + 5, 75);
    timeframe = '2-3 weeks';
    riskReward = '1:3';
    tags = ['unusual-flow', 'momentum', 'defined-risk'];

  } else if (isBullish && analysis.aboveSMA) {
    // TREND CONTINUATION
    type = 'Bull Call Spread';
    const buyStrike = roundToStrike(price * 1.0, price);
    const sellStrike = roundToStrike(price * 1.08, price);
    const expiry = getExpiryDate(30);
    
    entry = {
      action: `Buy ${buyStrike}/${sellStrike} Call Spread ${expiry}`,
      strike: buyStrike,
      expiry,
      premium: Math.round(price * 0.02 * 100) / 100,
      note: `Trend continuation - price above SMA21 ($${analysis.sma21.toFixed(2)}) and SMA50 ($${analysis.sma50.toFixed(2)})`
    };
    targets = [
      (price * 1.03).toFixed(2),
      (price * 1.05).toFixed(2),
      (price * 1.08).toFixed(2)
    ];
    stopLoss = (price * 0.97).toFixed(2);
    maxProfit = `$${(sellStrike - buyStrike) * 100 - (price * 0.02 * 100)}`;
    maxLoss = `$${Math.round(price * 0.02 * 100)}`;
    probability = Math.min(confidenceScore, 70);
    timeframe = '2-4 weeks';
    riskReward = '1:2.5';
    tags = ['trend', 'bullish', 'defined-risk'];

  } else if (overallSentiment === 'strong_bearish' || overallSentiment === 'bearish') {
    // BEARISH SETUP
    type = 'Bear Put Spread';
    const buyStrike = roundToStrike(price * 1.0, price);
    const sellStrike = roundToStrike(price * 0.92, price);
    const expiry = getExpiryDate(21);
    
    entry = {
      action: `Buy ${buyStrike}/${sellStrike} Put Spread ${expiry}`,
      strike: buyStrike,
      expiry,
      premium: Math.round(price * 0.02 * 100) / 100,
      note: `Bearish signals: ${signals.filter(s => s.toLowerCase().includes('bear') || s.toLowerCase().includes('negative')).join(', ')}`
    };
    targets = [
      (price * 0.97).toFixed(2),
      (price * 0.94).toFixed(2),
      (price * 0.92).toFixed(2)
    ];
    stopLoss = (price * 1.03).toFixed(2);
    maxProfit = `$${(buyStrike - sellStrike) * 100 - (price * 0.02 * 100)}`;
    maxLoss = `$${Math.round(price * 0.02 * 100)}`;
    probability = Math.min(confidenceScore, 65);
    timeframe = '1-3 weeks';
    riskReward = '1:2';
    tags = ['bearish', 'defined-risk'];

  } else if (analysis.rsi < 30) {
    // OVERSOLD BOUNCE
    type = 'Oversold Bounce - Long Calls';
    const strikePrice = roundToStrike(price * 1.02, price);
    const expiry = getExpiryDate(14);
    
    entry = {
      action: `Buy ${strikePrice}C ${expiry}`,
      strike: strikePrice,
      expiry,
      premium: Math.round(price * 0.02 * 100) / 100,
      note: `RSI oversold at ${analysis.rsi.toFixed(0)} - potential mean reversion bounce`
    };
    targets = [
      (price * 1.03).toFixed(2),
      (price * 1.05).toFixed(2),
      (price * 1.08).toFixed(2)
    ];
    stopLoss = (price * 0.95).toFixed(2);
    maxProfit = '200-400%';
    maxLoss = '100% of premium';
    probability = 55;
    timeframe = '1-2 weeks';
    riskReward = '1:3';
    tags = ['oversold', 'reversal', 'high-risk'];

  } else {
    return null; // No clear setup
  }

  return {
    id: timestamp,
    symbol,
    type,
    confidence: confidenceScore,
    riskReward,
    timeframe,
    entry,
    reasoning: signals.slice(0, 5),
    targets,
    stopLoss,
    maxProfit,
    maxLoss,
    probability,
    tags,
    dataSource: dataSources
  };
}

function roundToStrike(targetPrice: number, basePrice: number): number {
  let interval: number;
  if (basePrice < 25) interval = 2.5;
  else if (basePrice < 200) interval = 5;
  else interval = 10;
  return Math.round(targetPrice / interval) * interval;
}

function getExpiryDate(daysOut: number): string {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysOut);
  
  // Find next Friday
  const dayOfWeek = targetDate.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  targetDate.setDate(targetDate.getDate() + daysUntilFriday);
  
  return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');
    
    const limit = limitParam ? parseInt(limitParam) : 10;
    const symbols = symbolParam 
      ? [symbolParam.toUpperCase()]
      : DEFAULT_SCAN_SYMBOLS;

    console.log(`Generating AI trade ideas for ${symbols.length} symbols...`);

    // Analyze all symbols in parallel
    const analysisPromises = symbols.map(symbol => analyzeStock(symbol));
    const analyses = await Promise.all(analysisPromises);

    // Generate trade ideas from valid analyses
    const tradeIdeas: TradeIdea[] = [];
    
    for (const analysis of analyses) {
      if (analysis) {
        const idea = generateTradeIdea(analysis);
        if (idea) {
          tradeIdeas.push(idea);
        }
      }
    }

    // Sort by confidence score
    tradeIdeas.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      status: 'success',
      data: tradeIdeas.slice(0, limit),
      count: tradeIdeas.length,
      totalScanned: symbols.length,
      timestamp: Date.now(),
      dataSources: ['Polygon', 'Unusual Whales', 'ORTEX']
    });

  } catch (error) {
    console.error('AI Trade Ideas API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid symbols array', data: [] },
        { status: 400 }
      );
    }

    const upperSymbols = symbols.map((s: string) => s.toUpperCase());
    
    // Analyze all symbols
    const analysisPromises = upperSymbols.map((symbol: string) => analyzeStock(symbol));
    const analyses = await Promise.all(analysisPromises);

    // Generate trade ideas
    const tradeIdeas: TradeIdea[] = [];
    
    for (const analysis of analyses) {
      if (analysis) {
        const idea = generateTradeIdea(analysis);
        if (idea) {
          tradeIdeas.push(idea);
        }
      }
    }

    tradeIdeas.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({
      status: 'success',
      data: tradeIdeas,
      count: tradeIdeas.length,
      totalScanned: symbols.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('AI Trade Ideas POST error:', error);
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error', data: [] },
      { status: 500 }
    );
  }
}
