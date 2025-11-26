/**
 * Enhanced API Services
 * Integrates Polygon, Unusual Whales, and ORTEX data
 */

// ============ POLYGON API ============
export interface PolygonQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface PolygonCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  timestamp: number;
}

export async function fetchPolygonQuote(symbol: string): Promise<PolygonQuote | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.error('POLYGON_API_KEY not set');
    return null;
  }

  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results[0]) {
      const r = data.results[0];
      return {
        symbol,
        price: r.c,
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
        vwap: r.vw || r.c,
        change: r.c - r.o,
        changePercent: ((r.c - r.o) / r.o) * 100,
        timestamp: r.t
      };
    }
    return null;
  } catch (error) {
    console.error(`Polygon quote error for ${symbol}:`, error);
    return null;
  }
}

export async function fetchPolygonCandles(
  symbol: string,
  multiplier: number,
  timespan: 'minute' | 'hour' | 'day',
  limit: number = 100
): Promise<PolygonCandle[]> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.error('POLYGON_API_KEY not set');
    return [];
  }

  try {
    const to = new Date();
    const from = new Date();
    
    if (timespan === 'minute') {
      from.setDate(from.getDate() - 5);
    } else if (timespan === 'hour') {
      from.setDate(from.getDate() - 30);
    } else {
      from.setFullYear(from.getFullYear() - 2);
    }

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromStr}/${toStr}?adjusted=true&sort=asc&limit=${limit}&apiKey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results.map((r: any) => ({
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
        vwap: r.vw || r.c,
        timestamp: r.t
      }));
    }
    return [];
  } catch (error) {
    console.error(`Polygon candles error for ${symbol}:`, error);
    return [];
  }
}

export async function fetchPolygonSnapshot(symbol: string): Promise<any | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.ticker || null;
  } catch (error) {
    console.error(`Polygon snapshot error for ${symbol}:`, error);
    return null;
  }
}

// ============ UNUSUAL WHALES API ============
export interface UWFlowData {
  symbol: string;
  totalPremium: number;
  callPremium: number;
  putPremium: number;
  callVolume: number;
  putVolume: number;
  putCallRatio: number;
  netPremium: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  unusualActivity: boolean;
  largestTrades: Array<{
    type: 'call' | 'put';
    strike: number;
    expiry: string;
    premium: number;
    size: number;
    side: 'bid' | 'ask' | 'mid';
  }>;
}

export async function fetchUWFlow(symbol: string): Promise<UWFlowData | null> {
  const apiKey = process.env.UNUSUAL_WHALES_KEY;
  if (!apiKey) {
    console.error('UNUSUAL_WHALES_KEY not set');
    return null;
  }

  try {
    // UW Basic tier endpoint for stock flow
    const url = `https://api.unusualwhales.com/api/stock/${symbol}/flow`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`UW API returned ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    
    if (data.data) {
      const flow = data.data;
      const callPremium = flow.call_premium || 0;
      const putPremium = flow.put_premium || 0;
      const callVolume = flow.call_volume || 0;
      const putVolume = flow.put_volume || 0;
      
      const putCallRatio = callVolume > 0 ? putVolume / callVolume : 0;
      const netPremium = callPremium - putPremium;
      
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (netPremium > 100000) sentiment = 'bullish';
      else if (netPremium < -100000) sentiment = 'bearish';

      return {
        symbol,
        totalPremium: callPremium + putPremium,
        callPremium,
        putPremium,
        callVolume,
        putVolume,
        putCallRatio,
        netPremium,
        sentiment,
        unusualActivity: flow.unusual || false,
        largestTrades: (flow.largest_trades || []).slice(0, 5).map((t: any) => ({
          type: t.option_type?.toLowerCase() || 'call',
          strike: t.strike || 0,
          expiry: t.expiry || '',
          premium: t.premium || 0,
          size: t.size || 0,
          side: t.side?.toLowerCase() || 'mid'
        }))
      };
    }
    return null;
  } catch (error) {
    console.error(`UW flow error for ${symbol}:`, error);
    return null;
  }
}

export async function fetchUWMarketOverview(): Promise<any | null> {
  const apiKey = process.env.UNUSUAL_WHALES_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.unusualwhales.com/api/market/overview`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('UW market overview error:', error);
    return null;
  }
}

// ============ ORTEX API ============
export interface OrtexShortData {
  symbol: string;
  shortInterest: number;
  shortInterestPercent: number;
  utilization: number;
  daysToCover: number;
  costToBorrow: number;
  shortInterestChange: number;
  shares_on_loan: number;
  free_float: number;
  squeeze_score: number;
}

export async function fetchOrtexShortData(symbol: string): Promise<OrtexShortData | null> {
  const apiKey = process.env.ORTEX_API_KEY;
  if (!apiKey) {
    console.error('ORTEX_API_KEY not set');
    return null;
  }

  try {
    // ORTEX API endpoint for short interest
    const url = `https://api.ortex.com/v1/stock/${symbol}/short-interest`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Api-Key ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`ORTEX API returned ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();
    
    if (data) {
      // Calculate squeeze score based on multiple factors
      const utilization = data.utilization || 0;
      const daysToCover = data.days_to_cover || 0;
      const siPercent = data.short_interest_percent || 0;
      const costToBorrow = data.cost_to_borrow || 0;
      
      // Squeeze score: higher = more squeeze potential
      let squeezeScore = 0;
      if (siPercent > 20) squeezeScore += 30;
      else if (siPercent > 10) squeezeScore += 20;
      else if (siPercent > 5) squeezeScore += 10;
      
      if (utilization > 90) squeezeScore += 30;
      else if (utilization > 70) squeezeScore += 20;
      else if (utilization > 50) squeezeScore += 10;
      
      if (daysToCover > 5) squeezeScore += 20;
      else if (daysToCover > 3) squeezeScore += 15;
      else if (daysToCover > 1) squeezeScore += 10;
      
      if (costToBorrow > 50) squeezeScore += 20;
      else if (costToBorrow > 20) squeezeScore += 10;

      return {
        symbol,
        shortInterest: data.short_interest || 0,
        shortInterestPercent: siPercent,
        utilization,
        daysToCover,
        costToBorrow,
        shortInterestChange: data.short_interest_change || 0,
        shares_on_loan: data.shares_on_loan || 0,
        free_float: data.free_float || 0,
        squeeze_score: Math.min(squeezeScore, 100)
      };
    }
    return null;
  } catch (error) {
    console.error(`ORTEX error for ${symbol}:`, error);
    return null;
  }
}

// ============ COMBINED ANALYSIS ============
export interface EnhancedStockAnalysis {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  
  // Technical
  rsi: number;
  macdHistogram: number;
  sma9: number;
  sma21: number;
  sma50: number;
  aboveSMA: boolean;
  
  // Options Flow (UW)
  optionsFlow: UWFlowData | null;
  
  // Short Interest (ORTEX)
  shortData: OrtexShortData | null;
  
  // Combined Signals
  signals: string[];
  overallSentiment: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  confidenceScore: number;
  tradeSetup: string | null;
}

export async function analyzeStock(symbol: string): Promise<EnhancedStockAnalysis | null> {
  try {
    // Fetch all data in parallel
    const [quote, candles, flowData, shortData] = await Promise.all([
      fetchPolygonQuote(symbol),
      fetchPolygonCandles(symbol, 1, 'day', 50),
      fetchUWFlow(symbol),
      fetchOrtexShortData(symbol)
    ]);

    if (!quote || candles.length < 20) {
      console.warn(`Insufficient data for ${symbol}`);
      return null;
    }

    const closes = candles.map(c => c.close);
    
    // Calculate technicals
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const sma9 = calculateSMA(closes, 9);
    const sma21 = calculateSMA(closes, 21);
    const sma50 = calculateSMA(closes, Math.min(50, closes.length));
    const aboveSMA = quote.price > sma21 && quote.price > sma50;

    // Generate signals
    const signals: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;

    // Technical signals
    if (rsi > 70) {
      signals.push('RSI overbought (>70)');
      bearishPoints += 1;
    } else if (rsi < 30) {
      signals.push('RSI oversold (<30)');
      bullishPoints += 1;
    } else if (rsi > 50) {
      bullishPoints += 0.5;
    } else {
      bearishPoints += 0.5;
    }

    if (macd.histogram > 0) {
      signals.push('MACD histogram positive');
      bullishPoints += 1;
    } else {
      signals.push('MACD histogram negative');
      bearishPoints += 1;
    }

    if (aboveSMA) {
      signals.push('Price above SMA21 & SMA50');
      bullishPoints += 1;
    } else {
      signals.push('Price below key SMAs');
      bearishPoints += 1;
    }

    // Options flow signals
    if (flowData) {
      if (flowData.sentiment === 'bullish') {
        signals.push(`Bullish options flow ($${(flowData.netPremium / 1000000).toFixed(1)}M net calls)`);
        bullishPoints += 2;
      } else if (flowData.sentiment === 'bearish') {
        signals.push(`Bearish options flow ($${(Math.abs(flowData.netPremium) / 1000000).toFixed(1)}M net puts)`);
        bearishPoints += 2;
      }
      
      if (flowData.unusualActivity) {
        signals.push('⚠️ Unusual options activity detected');
        bullishPoints += 1; // Usually bullish when whales are active
      }
      
      if (flowData.putCallRatio > 1.5) {
        signals.push(`High put/call ratio: ${flowData.putCallRatio.toFixed(2)}`);
        bearishPoints += 1;
      } else if (flowData.putCallRatio < 0.5) {
        signals.push(`Low put/call ratio: ${flowData.putCallRatio.toFixed(2)}`);
        bullishPoints += 1;
      }
    }

    // Short interest signals
    if (shortData) {
      if (shortData.squeeze_score >= 70) {
        signals.push(`🔥 High squeeze potential (score: ${shortData.squeeze_score})`);
        bullishPoints += 3;
      } else if (shortData.squeeze_score >= 50) {
        signals.push(`Elevated squeeze score: ${shortData.squeeze_score}`);
        bullishPoints += 1;
      }
      
      if (shortData.shortInterestPercent > 20) {
        signals.push(`High short interest: ${shortData.shortInterestPercent.toFixed(1)}%`);
        bullishPoints += 1; // Squeeze potential
      }
      
      if (shortData.daysToCover > 5) {
        signals.push(`Days to cover: ${shortData.daysToCover.toFixed(1)}`);
        bullishPoints += 1;
      }
      
      if (shortData.utilization > 90) {
        signals.push(`Utilization: ${shortData.utilization.toFixed(0)}% (very high)`);
        bullishPoints += 1;
      }
    }

    // Determine overall sentiment
    const netScore = bullishPoints - bearishPoints;
    let overallSentiment: EnhancedStockAnalysis['overallSentiment'];
    if (netScore >= 5) overallSentiment = 'strong_bullish';
    else if (netScore >= 2) overallSentiment = 'bullish';
    else if (netScore <= -5) overallSentiment = 'strong_bearish';
    else if (netScore <= -2) overallSentiment = 'bearish';
    else overallSentiment = 'neutral';

    // Confidence score (0-100)
    const totalPoints = bullishPoints + bearishPoints;
    const confidenceScore = Math.min(Math.round((Math.abs(netScore) / Math.max(totalPoints, 1)) * 100), 100);

    // Generate trade setup
    let tradeSetup: string | null = null;
    if (overallSentiment === 'strong_bullish' && shortData?.squeeze_score && shortData.squeeze_score >= 70) {
      tradeSetup = 'SQUEEZE PLAY: High short interest + bullish flow = potential gamma squeeze';
    } else if (overallSentiment === 'strong_bullish' && flowData?.unusualActivity) {
      tradeSetup = 'MOMENTUM LONG: Strong bullish flow with unusual activity';
    } else if (overallSentiment === 'bullish' && aboveSMA) {
      tradeSetup = 'TREND CONTINUATION: Above key MAs with bullish signals';
    } else if (overallSentiment === 'strong_bearish') {
      tradeSetup = 'BEARISH SETUP: Consider puts or short position';
    } else if (rsi < 30 && overallSentiment !== 'strong_bearish') {
      tradeSetup = 'OVERSOLD BOUNCE: RSI oversold, watch for reversal';
    }

    return {
      symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      rsi,
      macdHistogram: macd.histogram,
      sma9,
      sma21,
      sma50,
      aboveSMA,
      optionsFlow: flowData,
      shortData,
      signals,
      overallSentiment,
      confidenceScore,
      tradeSetup
    };
  } catch (error) {
    console.error(`Analysis error for ${symbol}:`, error);
    return null;
  }
}

// ============ HELPER FUNCTIONS ============
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(closes: number[]): { line: number; signal: number; histogram: number } {
  if (closes.length < 26) {
    return { line: 0, signal: 0, histogram: 0 };
  }
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  const macdSignal = macdLine * 0.9;
  const histogram = macdLine - macdSignal;
  
  return { line: macdLine, signal: macdSignal, histogram };
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  
  return ema;
}
