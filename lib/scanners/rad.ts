// RAD (Resistance After Dip) Scanner Module
import { 
  StockData, 
  RADSetupData, 
  RADConfig, 
  PriceBar 
} from './types';

// Default RAD configuration
export const DEFAULT_RAD_CONFIG: RADConfig = {
  atrMultiplier: 1.8,
  lookbackPeriod: 20,
  consolidationDays: 5,
  rangeThreshold: 0.70,
  bullishThreshold: 3.0,
  bearishThreshold: -2.0,
  emaLength: 21
};

/**
 * Calculate Average True Range
 */
export function calculateATR(bars: PriceBar[], period: number = 14): number {
  if (bars.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  // Simple moving average of true ranges
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  
  const multiplier = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema.push(newEMA);
  }
  
  return ema;
}

/**
 * Find swing high/low points
 */
export function findSwingPoints(bars: PriceBar[], lookback: number = 3): {
  swingHighs: { index: number; price: number }[];
  swingLows: { index: number; price: number }[];
} {
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];
  
  for (let i = lookback; i < bars.length - lookback; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let j = 1; j <= lookback; j++) {
      if (bars[i].high <= bars[i - j].high || bars[i].high <= bars[i + j].high) {
        isSwingHigh = false;
      }
      if (bars[i].low >= bars[i - j].low || bars[i].low >= bars[i + j].low) {
        isSwingLow = false;
      }
    }
    
    if (isSwingHigh) swingHighs.push({ index: i, price: bars[i].high });
    if (isSwingLow) swingLows.push({ index: i, price: bars[i].low });
  }
  
  return { swingHighs, swingLows };
}

/**
 * Count higher lows in consolidation
 */
export function countHigherLows(swingLows: { index: number; price: number }[], minCount: number = 2): number {
  if (swingLows.length < 2) return 0;
  
  let count = 0;
  const recentLows = swingLows.slice(-5);
  
  for (let i = 1; i < recentLows.length; i++) {
    if (recentLows[i].price > recentLows[i - 1].price) {
      count++;
    }
  }
  
  return count;
}

/**
 * Count lower highs in consolidation
 */
export function countLowerHighs(swingHighs: { index: number; price: number }[], minCount: number = 2): number {
  if (swingHighs.length < 2) return 0;
  
  let count = 0;
  const recentHighs = swingHighs.slice(-5);
  
  for (let i = 1; i < recentHighs.length; i++) {
    if (recentHighs[i].price < recentHighs[i - 1].price) {
      count++;
    }
  }
  
  return count;
}

/**
 * Full RAD analysis with price bars
 */
export function analyzeRAD(
  bars: PriceBar[],
  config: RADConfig = DEFAULT_RAD_CONFIG
): RADSetupData {
  const signals: string[] = [];
  let score = 0;
  
  if (bars.length < config.lookbackPeriod) {
    return {
      score: 0,
      normalizedScore: 50,
      signal: 'NEUTRAL',
      trend: 'UP',
      dipPercent: 0,
      consolRange: 0,
      higherLows: 0,
      lowerHighs: 0,
      emaValue: 0,
      isAboveTrend: false,
      signals: ['Insufficient data for RAD analysis']
    };
  }
  
  // Calculate ATR
  const atr = calculateATR(bars, 14);
  const currentPrice = bars[bars.length - 1].close;
  
  // Calculate EMA
  const closePrices = bars.map(b => b.close);
  const emaValues = calculateEMA(closePrices, config.emaLength);
  const currentEMA = emaValues[emaValues.length - 1];
  const isAboveTrend = currentPrice > currentEMA;
  
  // Find recent high and measure dip
  const lookbackBars = bars.slice(-config.lookbackPeriod);
  const recentHigh = Math.max(...lookbackBars.map(b => b.high));
  const recentLow = Math.min(...lookbackBars.map(b => b.low));
  const dipFromHigh = ((recentHigh - recentLow) / recentHigh) * 100;
  const significantDip = dipFromHigh >= (atr / currentPrice) * config.atrMultiplier * 100;
  
  // Analyze consolidation
  const consolidationBars = bars.slice(-config.consolidationDays);
  const consolHigh = Math.max(...consolidationBars.map(b => b.high));
  const consolLow = Math.min(...consolidationBars.map(b => b.low));
  const consolRange = ((consolHigh - consolLow) / consolLow) * 100;
  const dipRange = recentHigh - recentLow;
  const isTightConsolidation = (consolHigh - consolLow) <= dipRange * config.rangeThreshold;
  
  // Find swing points and count patterns
  const { swingHighs, swingLows } = findSwingPoints(bars);
  const higherLows = countHigherLows(swingLows);
  const lowerHighs = countLowerHighs(swingHighs);
  
  // Determine trend
  const trend = isAboveTrend ? 'UP' : 'DOWN';
  
  // Scoring logic
  // Significant dip occurred
  if (significantDip) {
    score += 1;
    signals.push(`Significant dip: ${dipFromHigh.toFixed(1)}%`);
  }
  
  // Tight consolidation after dip
  if (isTightConsolidation) {
    score += 1;
    signals.push(`Tight consolidation: ${consolRange.toFixed(1)}% range`);
  }
  
  // Higher lows forming (bullish)
  if (higherLows >= 2) {
    score += higherLows * 0.5;
    signals.push(`${higherLows} higher lows forming`);
  }
  
  // Lower highs forming (bearish pressure)
  if (lowerHighs >= 2) {
    score -= lowerHighs * 0.5;
    signals.push(`${lowerHighs} lower highs (resistance)`);
  }
  
  // Price above EMA (bullish bias)
  if (isAboveTrend) {
    score += 0.5;
    signals.push('Price above EMA trend');
  } else {
    score -= 0.5;
    signals.push('Price below EMA trend');
  }
  
  // Recovery from dip
  const recoveryPercent = ((currentPrice - recentLow) / (recentHigh - recentLow)) * 100;
  if (recoveryPercent >= 50 && recoveryPercent <= 80) {
    score += 0.5;
    signals.push(`Healthy recovery: ${recoveryPercent.toFixed(0)}%`);
  }
  
  // Volume confirmation on consolidation
  const recentVolume = consolidationBars.reduce((sum, b) => sum + b.volume, 0) / consolidationBars.length;
  const priorVolume = lookbackBars.slice(0, -config.consolidationDays).reduce((sum, b) => sum + b.volume, 0) / (config.lookbackPeriod - config.consolidationDays);
  if (recentVolume < priorVolume * 0.7) {
    score += 0.5;
    signals.push('Volume declining in consolidation');
  }
  
  // Determine signal
  let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (score >= config.bullishThreshold) {
    signal = 'BULLISH';
    signals.unshift('🟢 RAD Setup: Bullish breakout potential');
  } else if (score <= config.bearishThreshold) {
    signal = 'BEARISH';
    signals.unshift('🔴 RAD Setup: Bearish breakdown risk');
  }
  
  // Normalize score to 0-100
  const normalizedScore = normalizeRADScore(score);
  
  return {
    score,
    normalizedScore,
    signal,
    trend,
    dipPercent: dipFromHigh,
    consolRange,
    higherLows,
    lowerHighs,
    emaValue: currentEMA,
    isAboveTrend,
    signals
  };
}

/**
 * Normalize raw RAD score to 0-100 scale
 */
export function normalizeRADScore(rawScore: number): number {
  // Raw score typically ranges from -5 to +5
  // Map to 0-100 scale with 50 as neutral
  const normalized = 50 + (rawScore * 10);
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Quick RAD score calculation using existing stock data
 * Used when full price bar history is not available
 */
export function calculateQuickRADScore(stock: StockData): number {
  let score = 50; // Start neutral
  const signals: string[] = [];
  
  // Use available data points for quick assessment
  
  // Price vs recent range (if we have high/low)
  if (stock.high && stock.low && stock.prevClose) {
    const range = stock.high - stock.low;
    const pricePosition = (stock.price - stock.low) / range;
    
    // Price near high of range = potential resistance (bearish for RAD)
    // Price near low but recovering = potential dip setup (bullish for RAD)
    if (pricePosition > 0.3 && pricePosition < 0.7) {
      score += 10; // Mid-range consolidation
      signals.push('Price consolidating in range');
    }
    
    // Recent dip with recovery
    if (stock.price < stock.prevClose * 0.97 && stock.changePercent > -3) {
      score += 15; // Dip with stabilization
      signals.push('Dip with stabilization');
    }
  }
  
  // Volume analysis
  if (stock.volume && stock.marketCap) {
    const avgVolume = stock.marketCap / stock.price / 250; // Rough estimate
    const volumeRatio = stock.volume / avgVolume;
    
    if (volumeRatio < 0.8) {
      score += 5; // Low volume consolidation
    } else if (volumeRatio > 1.5) {
      score -= 5; // High volume may indicate trend continuation not consolidation
    }
  }
  
  // Change percent analysis
  if (stock.changePercent > -5 && stock.changePercent < -1) {
    score += 10; // Moderate pullback
  } else if (stock.changePercent >= -1 && stock.changePercent <= 1) {
    score += 5; // Tight range
  } else if (stock.changePercent < -5) {
    score -= 10; // Too aggressive selling
  } else if (stock.changePercent > 3) {
    score -= 5; // Strong move up, not in dip
  }
  
  // If we have existing RAD data, use it
  if (stock.radSetup) {
    return stock.radSetup.normalizedScore;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate RAD signals for display
 */
export function generateRADSignals(data: RADSetupData): string[] {
  const displaySignals: string[] = [];
  
  if (data.signal === 'BULLISH') {
    displaySignals.push('✅ RAD Setup Active');
  }
  
  if (data.dipPercent >= 5) {
    displaySignals.push(`📉 Dip: ${data.dipPercent.toFixed(1)}%`);
  }
  
  if (data.consolRange <= 3) {
    displaySignals.push(`📊 Tight Range: ${data.consolRange.toFixed(1)}%`);
  }
  
  if (data.higherLows >= 2) {
    displaySignals.push(`📈 ${data.higherLows} Higher Lows`);
  }
  
  if (data.isAboveTrend) {
    displaySignals.push('⬆️ Above EMA');
  }
  
  return displaySignals;
}

/**
 * Check if stock has valid RAD setup
 */
export function hasValidRADSetup(data: RADSetupData): boolean {
  return (
    data.signal === 'BULLISH' &&
    data.dipPercent >= 3 &&
    data.higherLows >= 1 &&
    data.consolRange <= 5
  );
}

/**
 * Get RAD strength label
 */
export function getRADStrength(normalizedScore: number): string {
  if (normalizedScore >= 80) return 'Strong Setup';
  if (normalizedScore >= 65) return 'Good Setup';
  if (normalizedScore >= 50) return 'Developing';
  if (normalizedScore >= 35) return 'Weak';
  return 'No Setup';
}
