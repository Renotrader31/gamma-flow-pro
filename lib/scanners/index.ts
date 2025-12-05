// Unified Scanner Library - Main Export
// Import from '@/lib/scanners' for all scanner functionality

import {
  StockData,
  ScannerResult,
  ScanMode,
  ScanModeWeights,
  MODE_WEIGHTS,
  TANKFlowData,
  RADSetupData,
  MPLPZonesData,
  OSVMetricsData,
  LiquidityData
} from './types';

import { calculateQuickTANKScore, calculateTANKFlow, generateTANKSignals } from './tank';
import { calculateQuickRADScore, analyzeRAD, generateRADSignals } from './rad';
import { calculateQuickMPLPScore, analyzeMPLPZones, generateMPLPSignals } from './mplp';
import { calculateQuickOSVScore, analyzeOSVMetrics, generateOSVSignals } from './osv';

// Re-export everything
export * from './types';
export * from './tank';
export * from './rad';
export * from './mplp';
export * from './osv';

/**
 * Calculate combined score using mode-specific weights
 */
export function calculateCombinedScore(
  tankScore: number,
  radScore: number,
  mpLpScore: number,
  osvScore: number,
  liquidityScore: number,
  mode: ScanMode
): number {
  const weights = MODE_WEIGHTS[mode];
  
  const combined = 
    (tankScore * weights.tank) +
    (radScore * weights.rad) +
    (mpLpScore * weights.mpLp) +
    (osvScore * weights.osv) +
    (liquidityScore * weights.liquidity);
  
  return Math.round(combined);
}

/**
 * Get score breakdown for display
 */
export function getScoreBreakdown(
  tankScore: number,
  radScore: number,
  mpLpScore: number,
  osvScore: number,
  liquidityScore: number,
  mode: ScanMode
): {
  tank: { score: number; weight: number; contribution: number };
  rad: { score: number; weight: number; contribution: number };
  mpLp: { score: number; weight: number; contribution: number };
  osv: { score: number; weight: number; contribution: number };
  liquidity: { score: number; weight: number; contribution: number };
  total: number;
} {
  const weights = MODE_WEIGHTS[mode];
  
  return {
    tank: {
      score: tankScore,
      weight: weights.tank,
      contribution: Math.round(tankScore * weights.tank)
    },
    rad: {
      score: radScore,
      weight: weights.rad,
      contribution: Math.round(radScore * weights.rad)
    },
    mpLp: {
      score: mpLpScore,
      weight: weights.mpLp,
      contribution: Math.round(mpLpScore * weights.mpLp)
    },
    osv: {
      score: osvScore,
      weight: weights.osv,
      contribution: Math.round(osvScore * weights.osv)
    },
    liquidity: {
      score: liquidityScore,
      weight: weights.liquidity,
      contribution: Math.round(liquidityScore * weights.liquidity)
    },
    total: calculateCombinedScore(tankScore, radScore, mpLpScore, osvScore, liquidityScore, mode)
  };
}

/**
 * Process a single stock through all scanners
 */
export function processStock(stock: StockData, mode: ScanMode): ScannerResult {
  // Calculate individual scores using quick methods
  const tankScore = stock.tankFlow?.score ?? calculateQuickTANKScore(stock);
  const radScore = stock.radSetup?.normalizedScore ?? calculateQuickRADScore(stock);
  const mpLpScore = stock.mpLpZones?.score ?? calculateQuickMPLPScore(stock);
  const osvScore = stock.osvMetrics?.score ?? calculateQuickOSVScore(stock);
  const liquidityScore = stock.liquidity?.liquidityScore ?? 50;
  
  // Calculate combined score
  const combinedScore = calculateCombinedScore(
    tankScore, radScore, mpLpScore, osvScore, liquidityScore, mode
  );
  
  // Aggregate signals
  const signals: string[] = [];
  if (stock.tankFlow?.signals) signals.push(...stock.tankFlow.signals.slice(0, 2));
  if (stock.radSetup?.signals) signals.push(...stock.radSetup.signals.slice(0, 2));
  if (stock.mpLpZones?.signals) signals.push(...stock.mpLpZones.signals.slice(0, 2));
  if (stock.osvMetrics?.signals) signals.push(...stock.osvMetrics.signals.slice(0, 2));
  if (stock.liquidity?.liquiditySignals) signals.push(...stock.liquidity.liquiditySignals.slice(0, 2));
  
  return {
    symbol: stock.symbol,
    company: stock.name,
    price: stock.price,
    changePercent: stock.changePercent,
    volume: stock.volume,
    tankScore,
    radScore,
    mpLpScore,
    osvScore,
    liquidityScore,
    combinedScore,
    signals,
    tankFlow: stock.tankFlow,
    radSetup: stock.radSetup,
    mpLpZones: stock.mpLpZones,
    osvMetrics: stock.osvMetrics,
    liquidity: stock.liquidity
  };
}

/**
 * Process multiple stocks and sort by combined score
 */
export function processStocksForMode(
  stocks: StockData[],
  mode: ScanMode,
  limit: number = 20
): ScannerResult[] {
  const results = stocks.map(stock => processStock(stock, mode));
  
  // Sort by combined score descending
  results.sort((a, b) => b.combinedScore - a.combinedScore);
  
  return results.slice(0, limit);
}

/**
 * Get mode description for UI
 */
export function getModeDescription(mode: ScanMode): string {
  switch (mode) {
    case 'intraday':
      return 'Optimized for day trading: Emphasizes TANK flow (35%) and MP/LP zones (30%) for real-time institutional activity and gamma levels.';
    case 'swing':
      return 'Optimized for multi-day holds: Emphasizes RAD setups (35%) and OSV metrics (25%) for technical patterns and options sentiment.';
    case 'longterm':
      return 'Optimized for position trading: Emphasizes OSV metrics (40%) and TANK flow (20%) for sustained institutional positioning.';
    case 'liquidity':
      return 'Optimized for liquidity plays: Emphasizes Liquidity Hunter (50%) for FVG zones and order flow imbalances.';
    default:
      return '';
  }
}

/**
 * Get mode weights for display
 */
export function getModeWeightsDisplay(mode: ScanMode): { name: string; weight: number; color: string }[] {
  const weights = MODE_WEIGHTS[mode];
  
  return [
    { name: 'TANK', weight: weights.tank * 100, color: '#3b82f6' },
    { name: 'RAD', weight: weights.rad * 100, color: '#10b981' },
    { name: 'MP/LP', weight: weights.mpLp * 100, color: '#f59e0b' },
    { name: 'OSV', weight: weights.osv * 100, color: '#8b5cf6' },
    { name: 'Liquidity', weight: weights.liquidity * 100, color: '#ef4444' }
  ];
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981'; // Green
  if (score >= 60) return '#22c55e'; // Light green
  if (score >= 50) return '#f59e0b'; // Yellow
  if (score >= 40) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

/**
 * Get score label based on value
 */
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Strong Buy';
  if (score >= 75) return 'Buy';
  if (score >= 65) return 'Watch';
  if (score >= 50) return 'Neutral';
  if (score >= 40) return 'Weak';
  return 'Avoid';
}
/**
 * Filter stocks by minimum score threshold
 */
export function filterByScore(
  results: ScannerResult[],
  minScore: number = 60
): ScannerResult[] {
  return results.filter(r => r.combinedScore >= minScore);
}

/**
 * Filter stocks by specific scanner threshold
 */
export function filterByScanner(
  results: ScannerResult[],
  scanner: 'tank' | 'rad' | 'mpLp' | 'osv' | 'liquidity',
  minScore: number = 65
): ScannerResult[] {
  return results.filter(r => {
    switch (scanner) {
      case 'tank': return r.tankScore >= minScore;
      case 'rad': return r.radScore >= minScore;
      case 'mpLp': return r.mpLpScore >= minScore;
      case 'osv': return r.osvScore >= minScore;
      case 'liquidity': return r.liquidityScore >= minScore;
      default: return true;
    }
  });
}

/**
 * Get top movers by individual scanner
 */
export function getTopByScanner(
  results: ScannerResult[],
  scanner: 'tank' | 'rad' | 'mpLp' | 'osv' | 'liquidity',
  limit: number = 5
): ScannerResult[] {
  const sorted = [...results].sort((a, b) => {
    switch (scanner) {
      case 'tank': return b.tankScore - a.tankScore;
      case 'rad': return b.radScore - a.radScore;
      case 'mpLp': return b.mpLpScore - a.mpLpScore;
      case 'osv': return b.osvScore - a.osvScore;
      case 'liquidity': return b.liquidityScore - a.liquidityScore;
      default: return 0;
    }
  });
  
  return sorted.slice(0, limit);
}

/**
 * Aggregate signals from all scanners for a stock
 */
export function aggregateSignals(result: ScannerResult, maxSignals: number = 6): string[] {
  const allSignals: string[] = [];
  
  // Prioritize signals from highest weighted scanners based on scores
  const scannerPriority = [
    { name: 'tank', score: result.tankScore, signals: result.tankFlow?.signals },
    { name: 'rad', score: result.radScore, signals: result.radSetup?.signals },
    { name: 'mpLp', score: result.mpLpScore, signals: result.mpLpZones?.signals },
    { name: 'osv', score: result.osvScore, signals: result.osvMetrics?.signals },
    { name: 'liquidity', score: result.liquidityScore, signals: result.liquidity?.liquiditySignals }
  ].sort((a, b) => b.score - a.score);
  
  for (const scanner of scannerPriority) {
    if (scanner.signals && allSignals.length < maxSignals) {
      const remaining = maxSignals - allSignals.length;
      allSignals.push(...scanner.signals.slice(0, Math.min(2, remaining)));
    }
  }
  
  return allSignals;
}
