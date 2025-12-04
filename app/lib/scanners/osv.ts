// OSV (Options Summary View) Scanner Module
import { 
  StockData, 
  OSVMetricsData 
} from './types';

/**
 * Full OSV analysis with detailed options data
 */
export function analyzeOSVMetrics(
  symbol: string,
  optionsData: {
    callVolume: number;
    putVolume: number;
    callAskVolume?: number;
    callBidVolume?: number;
    putAskVolume?: number;
    putBidVolume?: number;
    callPremium?: number;
    putPremium?: number;
    maxPain?: number;
    maxPainExpiry?: string;
    avgVolume30d?: number;
  }
): OSVMetricsData {
  const signals: string[] = [];
  
  const {
    callVolume,
    putVolume,
    callAskVolume = callVolume * 0.6,
    callBidVolume = callVolume * 0.4,
    putAskVolume = putVolume * 0.4,
    putBidVolume = putVolume * 0.6,
    callPremium = 0,
    putPremium = 0,
    maxPain = 0,
    maxPainExpiry = '',
    avgVolume30d = (callVolume + putVolume)
  } = optionsData;
  
  // Calculate put/call ratio
  const totalVolume = callVolume + putVolume;
  const putCallRatio = callVolume > 0 ? putVolume / callVolume : 1;
  
  // Calculate volume vs average
  const volumeVsAvg = avgVolume30d > 0 ? (totalVolume / avgVolume30d) * 100 : 100;
  
  // Calculate net premiums
  // Bullish = calls bought on ask + puts sold on bid
  // Bearish = puts bought on ask + calls sold on bid
  const bullishPremium = (callAskVolume * (callPremium / callVolume || 1)) + 
                         (putBidVolume * (putPremium / putVolume || 1));
  const bearishPremium = (putAskVolume * (putPremium / putVolume || 1)) + 
                         (callBidVolume * (callPremium / callVolume || 1));
  
  const netCallPremium = callPremium * ((callAskVolume - callBidVolume) / callVolume || 0);
  const netPutPremium = putPremium * ((putAskVolume - putBidVolume) / putVolume || 0);
  
  // Determine sentiment
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  
  if (putCallRatio < 0.7 && bullishPremium > bearishPremium * 1.2) {
    sentiment = 'BULLISH';
    signals.push('🟢 Strong bullish options flow');
  } else if (putCallRatio < 0.85) {
    sentiment = 'BULLISH';
    signals.push('📈 Bullish P/C ratio');
  } else if (putCallRatio > 1.5 && bearishPremium > bullishPremium * 1.2) {
    sentiment = 'BEARISH';
    signals.push('🔴 Strong bearish options flow');
  } else if (putCallRatio > 1.3) {
    sentiment = 'BEARISH';
    signals.push('📉 Bearish P/C ratio');
  }
  
  // Volume signals
  if (volumeVsAvg > 200) {
    signals.push(`🔥 Extreme volume: ${volumeVsAvg.toFixed(0)}% of avg`);
  } else if (volumeVsAvg > 150) {
    signals.push(`📊 High volume: ${volumeVsAvg.toFixed(0)}% of avg`);
  }
  
  // Premium flow signals
  const netPremiumFlow = bullishPremium - bearishPremium;
  if (Math.abs(netPremiumFlow) > 10000000) {
    const direction = netPremiumFlow > 0 ? 'Bullish' : 'Bearish';
    signals.push(`💰 ${direction} premium: ${formatPremium(Math.abs(netPremiumFlow))}`);
  }
  
  // Max pain signal
  if (maxPain > 0) {
    signals.push(`🎯 Max Pain: $${maxPain.toFixed(2)}`);
  }
  
  // Call vs Put ask-side volume (buying pressure)
  const callBuyRatio = callAskVolume / (callAskVolume + callBidVolume);
  const putBuyRatio = putAskVolume / (putAskVolume + putBidVolume);
  
  if (callBuyRatio > 0.65) {
    signals.push('📞 Heavy call buying');
  }
  if (putBuyRatio > 0.65) {
    signals.push('📕 Heavy put buying');
  }
  
  // Calculate score
  const score = calculateOSVScore({
    totalCallVolume: callVolume,
    totalPutVolume: putVolume,
    putCallRatio,
    callAskVolume,
    callBidVolume,
    putAskVolume,
    putBidVolume,
    netCallPremium,
    netPutPremium,
    bullishPremium,
    bearishPremium,
    maxPain,
    maxPainExpiry,
    volumeVsAvg,
    sentiment,
    score: 0,
    signals: []
  });
  
  return {
    totalCallVolume: callVolume,
    totalPutVolume: putVolume,
    putCallRatio,
    callAskVolume,
    callBidVolume,
    putAskVolume,
    putBidVolume,
    netCallPremium,
    netPutPremium,
    bullishPremium,
    bearishPremium,
    maxPain,
    maxPainExpiry,
    volumeVsAvg,
    sentiment,
    score,
    signals
  };
}

/**
 * Calculate OSV score from metrics
 */
export function calculateOSVScore(data: OSVMetricsData): number {
  let score = 50; // Start neutral
  
  // Put/Call ratio scoring (major factor)
  if (data.putCallRatio < 0.5) {
    score += 20; // Extremely bullish
  } else if (data.putCallRatio < 0.7) {
    score += 15;
  } else if (data.putCallRatio < 0.85) {
    score += 8;
  } else if (data.putCallRatio > 2.0) {
    score -= 20; // Extremely bearish
  } else if (data.putCallRatio > 1.5) {
    score -= 15;
  } else if (data.putCallRatio > 1.2) {
    score -= 8;
  }
  
  // Volume vs average scoring
  if (data.volumeVsAvg > 200) {
    // High volume amplifies the signal
    const multiplier = data.sentiment === 'BULLISH' ? 1 : -1;
    score += 10 * multiplier;
  } else if (data.volumeVsAvg > 150) {
    const multiplier = data.sentiment === 'BULLISH' ? 1 : -1;
    score += 5 * multiplier;
  }
  
  // Premium flow scoring
  const netFlow = data.bullishPremium - data.bearishPremium;
  if (netFlow > 50000000) {
    score += 15; // $50M+ bullish
  } else if (netFlow > 20000000) {
    score += 10;
  } else if (netFlow > 10000000) {
    score += 5;
  } else if (netFlow < -50000000) {
    score -= 15; // $50M+ bearish
  } else if (netFlow < -20000000) {
    score -= 10;
  } else if (netFlow < -10000000) {
    score -= 5;
  }
  
  // Ask-side dominance (buying pressure)
  const totalAsk = data.callAskVolume + data.putAskVolume;
  const totalBid = data.callBidVolume + data.putBidVolume;
  const callAskRatio = data.callAskVolume / (data.callAskVolume + data.callBidVolume);
  const putAskRatio = data.putAskVolume / (data.putAskVolume + data.putBidVolume);
  
  // Heavy call buying = bullish
  if (callAskRatio > 0.7) {
    score += 8;
  } else if (callAskRatio > 0.6) {
    score += 4;
  }
  
  // Heavy put buying = bearish
  if (putAskRatio > 0.7) {
    score -= 8;
  } else if (putAskRatio > 0.6) {
    score -= 4;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Quick OSV score using existing stock data
 * Used when detailed options breakdown is not available
 */
export function calculateQuickOSVScore(stock: StockData): number {
  let score = 50;
  
  // Use put/call ratio if available
  if (stock.putCallRatio !== undefined) {
    if (stock.putCallRatio < 0.5) {
      score += 20;
    } else if (stock.putCallRatio < 0.7) {
      score += 15;
    } else if (stock.putCallRatio < 0.85) {
      score += 8;
    } else if (stock.putCallRatio > 2.0) {
      score -= 20;
    } else if (stock.putCallRatio > 1.5) {
      score -= 15;
    } else if (stock.putCallRatio > 1.2) {
      score -= 8;
    }
  }
  
  // Use net premium if available
  if (stock.netPremium !== undefined) {
    if (stock.netPremium > 50000000) {
      score += 12;
    } else if (stock.netPremium > 20000000) {
      score += 8;
    } else if (stock.netPremium > 5000000) {
      score += 4;
    } else if (stock.netPremium < -50000000) {
      score -= 12;
    } else if (stock.netPremium < -20000000) {
      score -= 8;
    } else if (stock.netPremium < -5000000) {
      score -= 4;
    }
  }
  
  // Use flow score if available
  if (stock.flowScore !== undefined) {
    // Flow score is typically 0-100, adjust relative to 50
    const flowAdjustment = (stock.flowScore - 50) * 0.3;
    score += flowAdjustment;
  }
  
  // Use option volume vs stock volume ratio
  if (stock.optionVolume && stock.volume) {
    const optionToStockRatio = stock.optionVolume / stock.volume;
    if (optionToStockRatio > 0.5) {
      // High options activity relative to stock
      score += 5;
    }
  }
  
  // Use unusual activity score if available
  if (stock.unusualActivity !== undefined) {
    if (stock.unusualActivity > 80) {
      score += 8;
    } else if (stock.unusualActivity > 60) {
      score += 4;
    }
  }
  
  // Use IV rank if available
  if (stock.ivRank !== undefined) {
    // High IV rank can indicate expected movement
    if (stock.ivRank > 80) {
      score += 3; // High IV = expecting move
    } else if (stock.ivRank < 20) {
      score -= 2; // Low IV = complacency
    }
  }
  
  // Use max pain distance if available
  if (stock.maxPainDistance !== undefined) {
    // Price well below max pain is often bullish into expiry
    if (stock.maxPainDistance < -5) {
      score += 6;
    } else if (stock.maxPainDistance < -2) {
      score += 3;
    } else if (stock.maxPainDistance > 5) {
      score -= 4;
    }
  }
  
  // If we have existing OSV data, use it
  if (stock.osvMetrics) {
    return stock.osvMetrics.score;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine sentiment from P/C ratio and premium flow
 */
export function determineSentiment(
  putCallRatio: number,
  netPremiumFlow: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  // Strong signals
  if (putCallRatio < 0.7 && netPremiumFlow > 0) return 'BULLISH';
  if (putCallRatio > 1.3 && netPremiumFlow < 0) return 'BEARISH';
  
  // Moderate signals
  if (putCallRatio < 0.85) return 'BULLISH';
  if (putCallRatio > 1.15) return 'BEARISH';
  
  return 'NEUTRAL';
}

/**
 * Format premium value for display
 */
export function formatPremium(premium: number): string {
  const absPremium = Math.abs(premium);
  const sign = premium >= 0 ? '+' : '-';
  
  if (absPremium >= 1000000000) {
    return `${sign}$${(absPremium / 1000000000).toFixed(2)}B`;
  } else if (absPremium >= 1000000) {
    return `${sign}$${(absPremium / 1000000).toFixed(1)}M`;
  } else if (absPremium >= 1000) {
    return `${sign}$${(absPremium / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absPremium.toFixed(0)}`;
}

/**
 * Generate OSV signals for display
 */
export function generateOSVSignals(data: OSVMetricsData): string[] {
  const displaySignals: string[] = [];
  
  // Sentiment badge
  if (data.sentiment === 'BULLISH') {
    displaySignals.push('🟢 Bullish Flow');
  } else if (data.sentiment === 'BEARISH') {
    displaySignals.push('🔴 Bearish Flow');
  }
  
  // P/C Ratio
  displaySignals.push(`📊 P/C: ${data.putCallRatio.toFixed(2)}`);
  
  // Volume
  if (data.volumeVsAvg > 150) {
    displaySignals.push(`📈 Vol: ${data.volumeVsAvg.toFixed(0)}%`);
  }
  
  // Net premium
  const netPremium = data.bullishPremium - data.bearishPremium;
  if (Math.abs(netPremium) > 5000000) {
    displaySignals.push(`💰 ${formatPremium(netPremium)}`);
  }
  
  return displaySignals;
}

/**
 * Get sentiment strength description
 */
export function getSentimentStrength(score: number): string {
  if (score >= 80) return 'Strongly Bullish';
  if (score >= 65) return 'Moderately Bullish';
  if (score >= 55) return 'Slightly Bullish';
  if (score >= 45) return 'Neutral';
  if (score >= 35) return 'Slightly Bearish';
  if (score >= 20) return 'Moderately Bearish';
  return 'Strongly Bearish';
}

/**
 * Calculate options volume concentration
 */
export function calculateVolumeConcentration(
  callVolume: number,
  putVolume: number,
  callAskVolume: number,
  putAskVolume: number
): { callBuyPercent: number; putBuyPercent: number; dominantFlow: string } {
  const callBuyPercent = callVolume > 0 ? (callAskVolume / callVolume) * 100 : 50;
  const putBuyPercent = putVolume > 0 ? (putAskVolume / putVolume) * 100 : 50;
  
  let dominantFlow = 'Mixed';
  if (callBuyPercent > 60 && callVolume > putVolume) {
    dominantFlow = 'Call Buying';
  } else if (putBuyPercent > 60 && putVolume > callVolume) {
    dominantFlow = 'Put Buying';
  } else if (callBuyPercent < 40 && callVolume > putVolume) {
    dominantFlow = 'Call Selling';
  } else if (putBuyPercent < 40 && putVolume > callVolume) {
    dominantFlow = 'Put Selling';
  }
  
  return { callBuyPercent, putBuyPercent, dominantFlow };
}
