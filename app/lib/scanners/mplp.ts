// MP/LP (Magnet Price / Liquidity Pull) Zones Scanner Module
import { 
  StockData, 
  MPLPZonesData, 
  OptionsStrike 
} from './types';

/**
 * Full MP/LP Zones analysis with options chain data
 */
export function analyzeMPLPZones(
  currentPrice: number,
  optionsChain: OptionsStrike[],
  symbol: string
): MPLPZonesData {
  const signals: string[] = [];
  
  if (!optionsChain || optionsChain.length === 0) {
    return {
      magnetPrice: currentPrice,
      liquidityPull: currentPrice,
      callWall: currentPrice * 1.05,
      putWall: currentPrice * 0.95,
      netGEX: 0,
      putCallOIRatio: 1,
      priceVsMagnet: 'AT',
      gammaEnvironment: 'POSITIVE',
      score: 50,
      signals: ['No options data available']
    };
  }
  
  // Calculate total OI and GEX by strike
  let totalCallOI = 0;
  let totalPutOI = 0;
  let totalNetGamma = 0;
  let maxCallOI = 0;
  let maxPutOI = 0;
  let callWallStrike = currentPrice;
  let putWallStrike = currentPrice;
  let maxGammaStrike = currentPrice;
  let maxGamma = 0;
  
  // Find strikes with highest OI and gamma
  for (const strike of optionsChain) {
    totalCallOI += strike.callOI;
    totalPutOI += strike.putOI;
    totalNetGamma += strike.netGamma;
    
    // Track call wall (highest call OI above price)
    if (strike.strike > currentPrice && strike.callOI > maxCallOI) {
      maxCallOI = strike.callOI;
      callWallStrike = strike.strike;
    }
    
    // Track put wall (highest put OI below price)
    if (strike.strike < currentPrice && strike.putOI > maxPutOI) {
      maxPutOI = strike.putOI;
      putWallStrike = strike.strike;
    }
    
    // Track max gamma strike (magnet price)
    const absGamma = Math.abs(strike.netGamma);
    if (absGamma > maxGamma) {
      maxGamma = absGamma;
      maxGammaStrike = strike.strike;
    }
  }
  
  // Calculate magnet price (weighted by gamma)
  let gammaWeightedSum = 0;
  let totalAbsGamma = 0;
  for (const strike of optionsChain) {
    const absGamma = Math.abs(strike.netGamma);
    gammaWeightedSum += strike.strike * absGamma;
    totalAbsGamma += absGamma;
  }
  const magnetPrice = totalAbsGamma > 0 ? gammaWeightedSum / totalAbsGamma : currentPrice;
  
  // Calculate liquidity pull (weighted by OI)
  let oiWeightedSum = 0;
  let totalOI = totalCallOI + totalPutOI;
  for (const strike of optionsChain) {
    oiWeightedSum += strike.strike * (strike.callOI + strike.putOI);
  }
  const liquidityPull = totalOI > 0 ? oiWeightedSum / totalOI : currentPrice;
  
  // Determine gamma environment
  const gammaEnvironment = totalNetGamma >= 0 ? 'POSITIVE' : 'NEGATIVE';
  
  // Price vs magnet
  const magnetDistance = ((currentPrice - magnetPrice) / magnetPrice) * 100;
  let priceVsMagnet: 'ABOVE' | 'BELOW' | 'AT' = 'AT';
  if (magnetDistance > 0.5) priceVsMagnet = 'ABOVE';
  else if (magnetDistance < -0.5) priceVsMagnet = 'BELOW';
  
  // Put/Call OI ratio
  const putCallOIRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 1;
  
  // Generate signals
  if (gammaEnvironment === 'POSITIVE') {
    signals.push('🧲 Positive Gamma: Mean reversion likely');
  } else {
    signals.push('⚡ Negative Gamma: Trending/volatile');
  }
  
  if (priceVsMagnet === 'BELOW') {
    signals.push(`📈 Below magnet: Pull toward $${magnetPrice.toFixed(2)}`);
  } else if (priceVsMagnet === 'ABOVE') {
    signals.push(`📉 Above magnet: Pull toward $${magnetPrice.toFixed(2)}`);
  }
  
  const callWallDist = ((callWallStrike - currentPrice) / currentPrice) * 100;
  const putWallDist = ((currentPrice - putWallStrike) / currentPrice) * 100;
  
  signals.push(`🔼 Call Wall: $${callWallStrike.toFixed(2)} (+${callWallDist.toFixed(1)}%)`);
  signals.push(`🔽 Put Wall: $${putWallStrike.toFixed(2)} (-${putWallDist.toFixed(1)}%)`);
  
  if (putCallOIRatio < 0.8) {
    signals.push('📊 Bullish OI skew');
  } else if (putCallOIRatio > 1.2) {
    signals.push('📊 Bearish OI skew');
  }
  
  // Calculate score
  const score = calculateMPLPScore({
    magnetPrice,
    liquidityPull,
    callWall: callWallStrike,
    putWall: putWallStrike,
    netGEX: totalNetGamma,
    putCallOIRatio,
    priceVsMagnet,
    gammaEnvironment,
    score: 0,
    signals: []
  }, currentPrice);
  
  return {
    magnetPrice,
    liquidityPull,
    callWall: callWallStrike,
    putWall: putWallStrike,
    netGEX: totalNetGamma,
    putCallOIRatio,
    priceVsMagnet,
    gammaEnvironment,
    score,
    signals
  };
}

/**
 * Calculate MP/LP score from zones data
 */
export function calculateMPLPScore(data: MPLPZonesData, currentPrice: number): number {
  let score = 50; // Start neutral
  
  // Gamma environment scoring
  if (data.gammaEnvironment === 'POSITIVE') {
    // Positive gamma = mean reversion, more predictable
    score += 10;
    
    // Price below magnet in positive gamma = bullish pull
    if (data.priceVsMagnet === 'BELOW') {
      score += 15;
    } else if (data.priceVsMagnet === 'ABOVE') {
      score -= 5; // May pull back
    }
  } else {
    // Negative gamma = trending, volatile
    score -= 5;
    
    // In negative gamma, momentum matters more
    if (data.priceVsMagnet === 'BELOW') {
      score -= 10; // Could accelerate down
    }
  }
  
  // Put/Call ratio scoring
  if (data.putCallOIRatio < 0.7) {
    score += 10; // Very bullish positioning
  } else if (data.putCallOIRatio < 0.9) {
    score += 5; // Moderately bullish
  } else if (data.putCallOIRatio > 1.3) {
    score -= 10; // Bearish positioning
  } else if (data.putCallOIRatio > 1.1) {
    score -= 5; // Moderately bearish
  }
  
  // Distance to walls scoring
  const callWallDist = ((data.callWall - currentPrice) / currentPrice) * 100;
  const putWallDist = ((currentPrice - data.putWall) / currentPrice) * 100;
  
  // Closer to call wall = resistance
  if (callWallDist < 2) {
    score -= 10; // Very close to resistance
  } else if (callWallDist < 5) {
    score -= 5;
  }
  
  // Closer to put wall = support
  if (putWallDist < 2) {
    score += 5; // Near support, potential bounce
  }
  
  // Large GEX magnitude
  const gexMagnitude = Math.abs(data.netGEX);
  if (gexMagnitude > 100000000) { // $100M+
    score += 5; // Significant positioning
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Quick MP/LP score using existing stock data
 * Used when full options chain is not available
 */
export function calculateQuickMPLPScore(stock: StockData): number {
  let score = 50;
  
  // Use existing GEX data if available
  if (stock.gex !== undefined || stock.netGEX !== undefined) {
    const gex = stock.netGEX ?? stock.gex ?? 0;
    
    // Positive GEX
    if (gex > 50000000) {
      score += 15; // Strong positive gamma
    } else if (gex > 0) {
      score += 8;
    } else if (gex < -50000000) {
      score -= 10; // Strong negative gamma
    } else if (gex < 0) {
      score -= 5;
    }
  }
  
  // Use put/call ratio if available
  if (stock.putCallRatio !== undefined) {
    if (stock.putCallRatio < 0.7) {
      score += 12;
    } else if (stock.putCallRatio < 0.9) {
      score += 6;
    } else if (stock.putCallRatio > 1.3) {
      score -= 12;
    } else if (stock.putCallRatio > 1.1) {
      score -= 6;
    }
  }
  
  // Use gamma levels if available
  if (stock.gammaLevels) {
    const { flip, resistance, support } = stock.gammaLevels;
    
    // Price vs gamma flip
    if (flip) {
      if (stock.price > flip) {
        score += 8; // Above gamma flip = bullish
      } else {
        score -= 5; // Below gamma flip
      }
    }
    
    // Distance to nearest resistance
    if (resistance && resistance.length > 0) {
      const nearestRes = resistance.sort((a, b) => a - b).find(r => r > stock.price);
      if (nearestRes) {
        const distToRes = ((nearestRes - stock.price) / stock.price) * 100;
        if (distToRes < 1) {
          score -= 10; // Very close to resistance
        } else if (distToRes < 3) {
          score -= 5;
        }
      }
    }
    
    // Distance to nearest support
    if (support && support.length > 0) {
      const nearestSup = support.sort((a, b) => b - a).find(s => s < stock.price);
      if (nearestSup) {
        const distToSup = ((stock.price - nearestSup) / stock.price) * 100;
        if (distToSup < 1) {
          score += 8; // Very close to support
        } else if (distToSup < 3) {
          score += 4;
        }
      }
    }
  }
  
  // Use max pain distance if available
  if (stock.maxPain && stock.maxPainDistance !== undefined) {
    // Price below max pain often bullish (pull toward max pain)
    if (stock.maxPainDistance < -3) {
      score += 8; // Well below max pain
    } else if (stock.maxPainDistance < 0) {
      score += 4;
    } else if (stock.maxPainDistance > 3) {
      score -= 5; // Well above max pain
    }
  }
  
  // If we have existing MP/LP data, use it
  if (stock.mpLpZones) {
    return stock.mpLpZones.score;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Transform raw options chain data to OptionsStrike format
 */
export function transformOptionsChain(rawChain: any[]): OptionsStrike[] {
  return rawChain.map(item => ({
    strike: item.strike || item.strikePrice || 0,
    callOI: item.callOI || item.call_open_interest || item.callOpenInterest || 0,
    putOI: item.putOI || item.put_open_interest || item.putOpenInterest || 0,
    callGamma: item.callGamma || item.call_gamma || 0,
    putGamma: item.putGamma || item.put_gamma || 0,
    netGamma: (item.callGamma || item.call_gamma || 0) - (item.putGamma || item.put_gamma || 0),
    callVolume: item.callVolume || item.call_volume || 0,
    putVolume: item.putVolume || item.put_volume || 0
  }));
}

/**
 * Generate MP/LP signals for display
 */
export function generateMPLPSignals(data: MPLPZonesData, currentPrice: number): string[] {
  const displaySignals: string[] = [];
  
  // Gamma environment
  if (data.gammaEnvironment === 'POSITIVE') {
    displaySignals.push('🧲 Positive GEX');
  } else {
    displaySignals.push('⚡ Negative GEX');
  }
  
  // Magnet pull direction
  const magnetDist = ((data.magnetPrice - currentPrice) / currentPrice) * 100;
  if (Math.abs(magnetDist) > 0.5) {
    const direction = magnetDist > 0 ? '↑' : '↓';
    displaySignals.push(`${direction} Magnet: $${data.magnetPrice.toFixed(2)}`);
  }
  
  // Key levels
  displaySignals.push(`🔼 Resist: $${data.callWall.toFixed(2)}`);
  displaySignals.push(`🔽 Support: $${data.putWall.toFixed(2)}`);
  
  return displaySignals;
}

/**
 * Format GEX value for display
 */
export function formatGEX(gex: number): string {
  const absGex = Math.abs(gex);
  const sign = gex >= 0 ? '+' : '-';
  
  if (absGex >= 1000000000) {
    return `${sign}$${(absGex / 1000000000).toFixed(2)}B`;
  } else if (absGex >= 1000000) {
    return `${sign}$${(absGex / 1000000).toFixed(1)}M`;
  } else if (absGex >= 1000) {
    return `${sign}$${(absGex / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absGex.toFixed(0)}`;
}

/**
 * Get gamma environment description
 */
export function getGammaEnvironmentDescription(environment: 'POSITIVE' | 'NEGATIVE'): string {
  if (environment === 'POSITIVE') {
    return 'Mean reversion expected - dealers hedge by selling highs, buying lows';
  }
  return 'Trending/volatile - dealers amplify moves, breakouts more likely';
}

/**
 * Calculate expected range based on gamma
 */
export function calculateExpectedRange(
  currentPrice: number,
  callWall: number,
  putWall: number,
  gammaEnvironment: 'POSITIVE' | 'NEGATIVE'
): { low: number; high: number; confidence: string } {
  const rangeMultiplier = gammaEnvironment === 'POSITIVE' ? 0.7 : 1.3;
  
  const rawHigh = callWall;
  const rawLow = putWall;
  
  const midpoint = (rawHigh + rawLow) / 2;
  const halfRange = ((rawHigh - rawLow) / 2) * rangeMultiplier;
  
  return {
    low: midpoint - halfRange,
    high: midpoint + halfRange,
    confidence: gammaEnvironment === 'POSITIVE' ? 'High' : 'Medium'
  };
}
