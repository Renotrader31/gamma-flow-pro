// TANK Flow Scanner Module
// Analyzes institutional order flow via Unusual Whales API

import { 
  TANKFlowData, 
  TANKFlowAlert, 
  DarkPoolPrint,
  StockData 
} from './types';

// ============================================
// Configuration
// ============================================
export const TANK_CONFIG = {
  largeInjectionThreshold: 500000,
  extremeInjectionThreshold: 1000000,
  extremeBullishRatio: 2.0,
  bullishRatio: 1.3,
  bearishRatio: 0.77,
  extremeBearishRatio: 0.5,
  significantNetFlow: 5000000,
  extremeNetFlow: 20000000,
  largeDarkPoolPrint: 1000000,
};

// ============================================
// Core Scoring Functions
// ============================================

export function calculateTANKFlow(flowAlerts: TANKFlowAlert[]): TANKFlowData {
  let buyPremium = 0;
  let sellPremium = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  let largeInjections = 0;
  const signals: string[] = [];

  flowAlerts.forEach(alert => {
    const askPrem = alert.askSidePremium || 0;
    const bidPrem = alert.bidSidePremium || 0;
    const volume = alert.totalSize || 0;
    const totalPrem = alert.totalPremium || 0;

    buyPremium += askPrem;
    sellPremium += bidPrem;

    const premSum = askPrem + bidPrem;
    if (premSum > 0) {
      buyVolume += Math.round(volume * (askPrem / premSum));
      sellVolume += Math.round(volume * (bidPrem / premSum));
    }

    if (totalPrem >= TANK_CONFIG.largeInjectionThreshold) {
      largeInjections++;
    }
  });

  const tankRatio = sellPremium > 0 ? buyPremium / sellPremium : (buyPremium > 0 ? Infinity : 1);
  const netFlow = buyPremium - sellPremium;

  let flowBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (tankRatio >= TANK_CONFIG.bullishRatio) {
    flowBias = 'BULLISH';
  } else if (tankRatio <= TANK_CONFIG.bearishRatio) {
    flowBias = 'BEARISH';
  }

  if (tankRatio >= TANK_CONFIG.extremeBullishRatio) {
    signals.push('🟢 Extreme Bullish Flow');
  } else if (tankRatio >= TANK_CONFIG.bullishRatio) {
    signals.push('🟢 Bullish Flow');
  } else if (tankRatio <= TANK_CONFIG.extremeBearishRatio) {
    signals.push('🔴 Extreme Bearish Flow');
  } else if (tankRatio <= TANK_CONFIG.bearishRatio) {
    signals.push('🔴 Bearish Flow');
  }

  if (Math.abs(netFlow) >= TANK_CONFIG.extremeNetFlow) {
    signals.push(`💰 Extreme Net Flow: ${formatMoney(netFlow)}`);
  } else if (Math.abs(netFlow) >= TANK_CONFIG.significantNetFlow) {
    signals.push(`💵 Significant Net Flow: ${formatMoney(netFlow)}`);
  }

  if (largeInjections >= 5) {
    signals.push(`💉 ${largeInjections} Large Injections`);
  } else if (largeInjections >= 2) {
    signals.push(`💉 ${largeInjections} Large Trades`);
  }

  const score = calculateTANKScore(tankRatio, netFlow, largeInjections, flowAlerts.length);

  return {
    tankRatio: Number.isFinite(tankRatio) ? tankRatio : 999,
    netFlow,
    buyPremium,
    sellPremium,
    buyVolume,
    sellVolume,
    flowBias,
    largeInjections,
    score,
    signals
  };
}

export function calculateTANKScore(
  tankRatio: number, 
  netFlow: number, 
  largeInjections: number,
  alertCount: number
): number {
  let score = 50;

  if (tankRatio >= TANK_CONFIG.extremeBullishRatio) {
    score += 25;
  } else if (tankRatio >= TANK_CONFIG.bullishRatio) {
    score += 15;
  } else if (tankRatio <= TANK_CONFIG.extremeBearishRatio) {
    score -= 25;
  } else if (tankRatio <= TANK_CONFIG.bearishRatio) {
    score -= 15;
  }

  if (Math.abs(netFlow) >= TANK_CONFIG.extremeNetFlow) {
    score += netFlow > 0 ? 20 : -20;
  } else if (Math.abs(netFlow) >= TANK_CONFIG.significantNetFlow) {
    score += netFlow > 0 ? 12 : -12;
  } else if (Math.abs(netFlow) >= 1000000) {
    score += netFlow > 0 ? 5 : -5;
  }

  score += Math.min(largeInjections * 3, 15);

  if (alertCount >= 50) {
    score += 10;
  } else if (alertCount >= 20) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

export function analyzeDarkPool(prints: DarkPoolPrint[]): {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bullishPrints: number;
  bearishPrints: number;
  totalPremium: number;
  signals: string[];
} {
  let bullishPrints = 0;
  let bearishPrints = 0;
  let totalPremium = 0;
  const signals: string[] = [];

  prints.forEach(print => {
    const nbboMid = (print.nbboAsk + print.nbboBid) / 2;
    const premium = print.premium || (print.price * print.size);
    totalPremium += premium;

    if (print.price > nbboMid) {
      bullishPrints++;
    } else {
      bearishPrints++;
    }

    if (premium >= TANK_CONFIG.largeDarkPoolPrint) {
      const sentiment = print.price > nbboMid ? '🟢' : '🔴';
      signals.push(`${sentiment} Large DP: ${formatMoney(premium)}`);
    }
  });

  const total = bullishPrints + bearishPrints;
  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  
  if (total > 0) {
    const bullishRatio = bullishPrints / total;
    if (bullishRatio >= 0.6) {
      sentiment = 'BULLISH';
    } else if (bullishRatio <= 0.4) {
      sentiment = 'BEARISH';
    }
  }

  return { sentiment, bullishPrints, bearishPrints, totalPremium, signals };
}

export function calculateQuickTANKScore(stock: StockData): number {
  let score = 50;

  if (stock.flowScore !== undefined) {
    score = stock.flowScore * 0.5 + 25;
  }

  if (stock.netPremium !== undefined) {
    if (stock.netPremium > 10000000) {
      score += 15;
    } else if (stock.netPremium > 5000000) {
      score += 10;
    } else if (stock.netPremium > 1000000) {
      score += 5;
    } else if (stock.netPremium < -10000000) {
      score -= 15;
    } else if (stock.netPremium < -5000000) {
      score -= 10;
    } else if (stock.netPremium < -1000000) {
      score -= 5;
    }
  }

  if (stock.optionVolume !== undefined) {
    if (stock.optionVolume > 100000) {
      score += 10;
    } else if (stock.optionVolume > 50000) {
      score += 5;
    }
  }

  if (stock.unusualActivity !== undefined && stock.unusualActivity > 50) {
    score += Math.min((stock.unusualActivity - 50) / 5, 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function generateTANKSignals(stock: StockData): string[] {
  const signals: string[] = [];

  if (stock.flowScore !== undefined) {
    if (stock.flowScore >= 75) {
      signals.push('Strong Bullish Flow');
    } else if (stock.flowScore >= 60) {
      signals.push('Bullish Flow');
    } else if (stock.flowScore <= 25) {
      signals.push('Strong Bearish Flow');
    } else if (stock.flowScore <= 40) {
      signals.push('Bearish Flow');
    }
  }

  if (stock.netPremium !== undefined) {
    if (Math.abs(stock.netPremium) >= 10000000) {
      signals.push(`Net Premium: ${formatMoney(stock.netPremium)}`);
    }
  }

  if (stock.unusualActivity !== undefined && stock.unusualActivity >= 70) {
    signals.push('⚡ Unusual Activity');
  }

  return signals;
}

export function transformFlowAlert(raw: any): TANKFlowAlert {
  return {
    ticker: raw.ticker,
    strike: parseFloat(raw.strike) || 0,
    expiry: raw.expiry || '',
    type: raw.type?.toLowerCase() === 'call' ? 'call' : 'put',
    totalPremium: parseFloat(raw.total_premium) || 0,
    askSidePremium: parseFloat(raw.total_ask_side_prem) || 0,
    bidSidePremium: parseFloat(raw.total_bid_side_prem) || 0,
    totalSize: parseInt(raw.total_size) || parseInt(raw.volume) || 0,
    isSweep: raw.has_sweep === true,
    isFloor: raw.has_floor === true,
    createdAt: raw.created_at || ''
  };
}

export function transformDarkPoolPrint(raw: any): DarkPoolPrint {
  return {
    ticker: raw.ticker,
    price: parseFloat(raw.price) || 0,
    size: parseInt(raw.size) || 0,
    premium: parseFloat(raw.premium) || 0,
    nbboAsk: parseFloat(raw.nbbo_ask) || 0,
    nbboBid: parseFloat(raw.nbbo_bid) || 0,
    executedAt: raw.executed_at || ''
  };
}

function formatMoney(num: number): string {
  const sign = num < 0 ? '-' : '+';
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return `${sign}$${(absNum / 1e9).toFixed(1)}B`;
  if (absNum >= 1e6) return `${sign}$${(absNum / 1e6).toFixed(1)}M`;
  if (absNum >= 1e3) return `${sign}$${(absNum / 1e3).toFixed(0)}K`;
  return `${sign}$${absNum.toFixed(0)}`;
}

export { formatMoney as formatTANKMoney };
